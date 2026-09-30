// Hand-written types matching supabase/schema.sql.
// Once the project is running, you can swap this for a generated file via:
//   npx supabase gen types typescript --project-id <ref> > src/lib/types.ts

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  free_forever: boolean;
  created_at: string;
};

export type Term = {
  id: string;
  user_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export type Course = {
  id: string;
  term_id: string;
  name: string;
  code: string | null;
  instructor: string | null;
  color: string;
  icon: string;
  created_at: string;
};

// What Claude extracts from an uploaded syllabus, before the student has
// reviewed/edited it. Stored verbatim in syllabi.parsed_json.
export type ParsedGradingCategory = {
  name: string;
  weight_pct: number;
  drop_lowest_n: number;
};

export type ParsedAssignment = {
  title: string;
  category_name: string | null;
  due_date: string | null; // YYYY-MM-DD, or null if not determinable
  due_time: string | null; // HH:MM 24h, or null
  points_possible: number | null;
  description: string | null;
  ai_summary: string | null;
};

export type ParsedScheduleBlock = {
  days: number[]; // 0 = Sunday ... 6 = Saturday
  start_time: string; // HH:MM 24h
  end_time: string; // HH:MM 24h
  location: string | null;
};

export type ParsedKeyPolicy = {
  title: string;
  summary: string;
};

export type ParsedSyllabusData = {
  course_summary: string | null;
  grading_categories: ParsedGradingCategory[];
  assignments: ParsedAssignment[];
  schedule_blocks: ParsedScheduleBlock[];
  key_policies: ParsedKeyPolicy[];
};

export type Syllabus = {
  id: string;
  course_id: string;
  file_url: string | null;
  raw_text: string | null;
  parsed_json: ParsedSyllabusData | null;
  review_status: "pending" | "reviewed";
  created_at: string;
};

export type GradeCategory = {
  id: string;
  course_id: string;
  name: string;
  weight_pct: number;
  drop_lowest_n: number;
  sort_order: number;
};

export type AssignmentStatus = "todo" | "in_progress" | "overdue" | "complete";

export type Assignment = {
  id: string;
  course_id: string;
  category_id: string | null;
  title: string;
  due_at: string | null;
  points_possible: number | null;
  points_earned: number | null;
  status: AssignmentStatus;
  description_raw: string | null;
  ai_summary: string | null;
  created_at: string;
};

// Convenience type for the assignments list/calendar views, which always
// join in the owning course's display info alongside the assignment itself.
export type AssignmentWithCourse = Assignment & {
  course: Pick<Course, "id" | "name" | "color" | "icon"> | null;
};

// A recurring weekly time block: either a class meeting (course_id set,
// name/color/icon borrowed from the course) or a student-added
// extracurricular (course_id null, title/color/icon of its own).
export type ScheduleBlock = {
  id: string;
  course_id: string | null;
  user_id: string | null;
  title: string | null;
  color: string | null;
  icon: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string | null;
};

// Convenience type for the schedule views: a class block's display info
// (name/color/icon) comes from the joined course; an extracurricular's comes
// from its own title/color/icon.
export type ScheduleBlockWithCourse = ScheduleBlock & {
  course: Pick<Course, "id" | "name" | "color" | "icon"> | null;
};

export type Subscription = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string | null;
  price_id: string | null;
  current_period_end: string | null;
};

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      terms: TableDef<Term>;
      courses: TableDef<Course>;
      syllabi: TableDef<Syllabus>;
      grade_categories: TableDef<GradeCategory>;
      assignments: TableDef<Assignment>;
      schedule_blocks: TableDef<ScheduleBlock>;
      subscriptions: TableDef<Subscription>;
    };
  };
};

// A course's suggested color palette, offered in the course-creation form.
export const COURSE_COLORS = [
  "#2c4a7c", // ink blue
  "#c97d13", // amber
  "#3f6b4a", // forest green
  "#8a3b5e", // plum
  "#3c7d8a", // teal
  "#a4442c", // brick
] as const;

export const COURSE_ICONS = ["📘", "🧪", "📐", "🎨", "💻", "📖", "🧬", "📊", "🎭", "⚖️"] as const;
