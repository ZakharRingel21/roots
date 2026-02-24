export type UserRole = 'admin' | 'editor' | 'user' | 'guest';
export type UserStatus = 'active' | 'pending' | 'blocked';
export type RelationshipType = 'parent' | 'child' | 'spouse' | 'sibling';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'clarification_requested';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  person_id: string | null;
  created_at: string;
}

export interface Tree {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface Person {
  id: string;
  tree_id: string;
  first_name: string;
  last_name: string;
  patronymic: string | null;
  birth_date: string | null;
  birth_place: string | null;
  death_date: string | null;
  death_place: string | null;
  burial_place: string | null;
  residence: string | null;
  avatar_url: string | null;
  avatar_thumb_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Relationship {
  id: string;
  person_id: string;
  related_person_id: string;
  relationship_type: RelationshipType;
  tree_id: string;
}

export interface Photo {
  id: string;
  person_id: string;
  file_url: string;
  caption: string | null;
  sort_order: number;
  uploaded_at: string;
}

export interface Document {
  id: string;
  person_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  uploaded_at: string;
}

export interface Section {
  id: string;
  person_id: string;
  title: string;
  content_html: string;
  sort_order: number;
}

export interface Proposal {
  id: string;
  proposed_by: string;
  target_person_id: string;
  field_changes: Record<string, { before: unknown; after: unknown }>;
  status: ProposalStatus;
  reviewed_by: string | null;
  comment: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface Invitation {
  id: string;
  token: string;
  created_by: string;
  target_person_id: string | null;
  expires_at: string;
  max_uses: number;
  used_count: number;
}

export interface FlowNodeData {
  id: string;
  first_name: string;
  last_name: string;
  patronymic: string | null;
  avatar_thumb_url: string | null;
  birth_date: string | null;
  [key: string]: unknown;
}

export interface FlowEdgeData {
  relationship_type: RelationshipType;
  [key: string]: unknown;
}
