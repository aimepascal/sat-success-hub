export type Resource = {
  id: string;
  title: string;
  category: string;
  section: string;
  summary: string;
  content: string;
  file_url: string | null;
  download_count: number;
  author_id: string | null;
  created_at: string;
};

export type ResourceComment = {
  id: string;
  resource_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: { display_name: string; avatar_url: string | null } | null;
};

export type ForumPost = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  image_url: string | null;
  topic: string;
  created_at: string;
  profiles?: { display_name: string; avatar_url: string | null } | null;
};

export type ForumReply = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  profiles?: { display_name: string; avatar_url: string | null } | null;
};

export type Scholarship = {
  id: string;
  name: string;
  institution: string;
  country: string;
  scholarship_type: string;
  amount: string | null;
  deadline: string;
  description: string;
  apply_url: string;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  school: string | null;
  target_score: number | null;
  score_improvement: number | null;
};
