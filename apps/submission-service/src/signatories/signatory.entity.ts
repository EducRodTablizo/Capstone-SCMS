export interface SignatoryConfig {
  prepared_by_title: string;
  reviewed_by_name: string;
  reviewed_by_title: string;
  recommending_name: string;
  recommending_title: string;
  approved_by_name: string;
  approved_by_title: string;
  updated_at: string;
  updated_by?: string;
}

export const DEFAULT_SIGNATORIES: SignatoryConfig = {
  prepared_by_title: 'Faculty Member / Course Instructor',
  reviewed_by_name: 'Dr. Maria Santos',
  reviewed_by_title: 'Academic Head, PUP Quezon City Branch',
  recommending_name: 'Assoc. Prof. Demetrio C. Quirino, Jr.',
  recommending_title: 'Campus Director, PUP Quezon City Campus',
  approved_by_name: 'Assoc. Prof. Anna Ruby P. Gapasin',
  approved_by_title: 'Vice President for Campuses',
  updated_at: new Date().toISOString()
};
