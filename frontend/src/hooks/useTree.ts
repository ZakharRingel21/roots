import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { treesApi, personsApi, relationshipsApi } from '../api/client';
import type { RelationshipType } from '../types';

export function useTrees() {
  return useQuery({
    queryKey: ['trees'],
    queryFn: treesApi.list,
  });
}

export function useTreeNodes(treeId: string) {
  return useQuery({
    queryKey: ['trees', treeId, 'nodes'],
    queryFn: () => treesApi.getNodes(treeId),
    enabled: !!treeId,
  });
}

export function useCreateTree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: treesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trees'] });
    },
  });
}

export function useDeleteTree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: treesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trees'] });
    },
  });
}

export function useCreatePerson(treeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof treesApi.createPerson>[1]) =>
      treesApi.createPerson(treeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trees', treeId, 'nodes'] });
    },
  });
}

export function usePerson(personId: string) {
  return useQuery({
    queryKey: ['persons', personId],
    queryFn: () => personsApi.get(personId),
    enabled: !!personId,
  });
}

export function useUpdatePerson(personId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof personsApi.update>[1]) =>
      personsApi.update(personId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['persons', personId], updated);
      queryClient.invalidateQueries({ queryKey: ['trees', updated.tree_id, 'nodes'] });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: personsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trees'] });
    },
  });
}

export function useCreateRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      person_id: string;
      related_person_id: string;
      relationship_type: RelationshipType;
      tree_id: string;
    }) => relationshipsApi.create(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trees', variables.tree_id, 'nodes'] });
    },
  });
}

export function useDeleteRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, treeId }: { id: string; treeId: string }) =>
      relationshipsApi.delete(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trees', variables.treeId, 'nodes'] });
    },
  });
}
