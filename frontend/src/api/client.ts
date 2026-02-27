import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  User,
  Tree,
  Person,
  Photo,
  Document,
  Section,
  Proposal,
  Invitation,
  Relationship,
  RelationshipType,
  ProposalStatus,
  UserRole,
  UserStatus,
  FlowNodeData,
  FlowEdgeData,
} from '../types';
import type { Node, Edge } from '@xyflow/react';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  config: InternalAxiosRequestConfig;
}> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      resolve(api(config));
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === '/auth/refresh' || originalRequest.url === '/auth/login') {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    invitation_token?: string;
  }) => api.post<User>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<User>('/auth/login', data).then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),

  refresh: () => api.post('/auth/refresh').then((r) => r.data),

  me: () => api.get<User>('/auth/me').then((r) => r.data),
};

// Trees
export const treesApi = {
  list: () => api.get<Tree[]>('/trees').then((r) => r.data),

  create: (data: { name: string }) =>
    api.post<Tree>('/trees', data).then((r) => r.data),

  delete: (id: string) => api.delete(`/trees/${id}`).then((r) => r.data),

  getNodes: (treeId: string) =>
    api
      .get<{ nodes: Node<FlowNodeData>[]; edges: Edge<FlowEdgeData>[] }>(`/trees/${treeId}/nodes`)
      .then((r) => r.data),

  createPerson: (
    treeId: string,
    data: {
      first_name: string;
      last_name: string;
      patronymic?: string;
      maiden_name?: string;
      gender?: 'male' | 'female';
      birth_date?: string;
      birth_place?: string;
      death_date?: string;
      death_place?: string;
      burial_place?: string;
      residence?: string;
    }
  ) => api.post<Person>(`/trees/${treeId}/persons`, data).then((r) => r.data),
};

// Persons
export const personsApi = {
  get: (id: string) => api.get<Person>(`/persons/${id}`).then((r) => r.data),

  update: (
    id: string,
    data: Partial<{
      first_name: string;
      last_name: string;
      patronymic: string;
      maiden_name: string;
      gender: 'male' | 'female';
      birth_date: string;
      birth_place: string;
      death_date: string;
      death_place: string;
      burial_place: string;
      residence: string;
    }>
  ) => api.put<Person>(`/persons/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/persons/${id}`).then((r) => r.data),

  getPhotos: (id: string) => api.get<Photo[]>(`/persons/${id}/photos`).then((r) => r.data),

  uploadPhoto: (id: string, file: File, caption?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);
    return api.post<Photo>(`/persons/${id}/photos`, formData).then((r) => r.data);
  },

  getDocuments: (id: string) =>
    api.get<Document[]>(`/persons/${id}/documents`).then((r) => r.data),

  uploadDocument: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Document>(`/persons/${id}/documents`, formData).then((r) => r.data);
  },

  getSections: (id: string) =>
    api.get<Section[]>(`/persons/${id}/sections`).then((r) => r.data),

  createSection: (id: string, data: { title: string; content_html: string; sort_order?: number }) =>
    api.post<Section>(`/persons/${id}/sections`, data).then((r) => r.data),
};

// Photos
export const photosApi = {
  update: (id: string, data: { caption?: string; sort_order?: number }) =>
    api.put<Photo>(`/photos/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/photos/${id}`).then((r) => r.data),
};

// Documents
export const documentsApi = {
  delete: (id: string) => api.delete(`/documents/${id}`).then((r) => r.data),
};

// Sections
export const sectionsApi = {
  update: (
    id: string,
    data: { title?: string; content_html?: string; sort_order?: number }
  ) => api.put<Section>(`/sections/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/sections/${id}`).then((r) => r.data),
};

// Relationships
export const relationshipsApi = {
  create: (data: {
    person_id: string;
    related_person_id: string;
    relationship_type: RelationshipType;
    tree_id: string;
  }) => api.post<Relationship>('/relationships', data).then((r) => r.data),

  delete: (id: string) => api.delete(`/relationships/${id}`).then((r) => r.data),
};

// Proposals
export const proposalsApi = {
  list: (params?: { tree_id?: string; status?: ProposalStatus }) =>
    api.get<Proposal[]>('/proposals', { params }).then((r) => r.data),

  create: (data: {
    target_person_id: string;
    field_changes: Record<string, { before: unknown; after: unknown }>;
  }) => api.post<Proposal>('/proposals', data).then((r) => r.data),

  patch: (id: string, data: { status: ProposalStatus; comment?: string }) =>
    api.patch<Proposal>(`/proposals/${id}`, data).then((r) => r.data),
};

// Invitations
export const invitationsApi = {
  list: () => api.get<Invitation[]>('/invitations').then((r) => r.data),

  create: (data: { target_person_id?: string; expires_hours: number; max_uses: number }) =>
    api.post<Invitation>('/invitations', data).then((r) => r.data),

  delete: (id: string) => api.delete(`/invitations/${id}`).then((r) => r.data),
};

// Search
export const searchApi = {
  search: (params: { q: string; tree_id?: string }) =>
    api.get<Person[]>('/search', { params }).then((r) => r.data),
};

// Admin
export const adminApi = {
  listUsers: () => api.get<User[]>('/admin/users').then((r) => r.data),

  updateUser: (id: string, data: { role?: UserRole; status?: UserStatus }) =>
    api.patch<User>(`/admin/users/${id}`, data).then((r) => r.data),
};

export default api;
