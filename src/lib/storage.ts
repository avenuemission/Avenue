// ============================================
// LOCAL STORAGE UTILITIES
// Form submissions are stored in localStorage
// Developer can export/view data as needed
// ============================================

export interface PathwayEOI {
  id: string;
  name: string;
  email: string;
  submittedAt: string;
}

export interface EmailSubscription {
  id: string;
  name: string;
  email: string;
  subscribedAt: string;
}

export interface IdeaSubmission {
  id: string;
  name?: string;
  email?: string;
  idea: string;
  submittedAt: string;
}

const STORAGE_KEYS = {
  pathwayEOI: "avenue_pathway_eoi",
  emailSubscriptions: "avenue_email_subscriptions",
  ideaSubmissions: "avenue_idea_submissions",
};

// Generate unique ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Pathway Expression of Interest
export const savePathwayEOI = (name: string, email: string): PathwayEOI => {
  const submissions = getPathwayEOIs();
  const newSubmission: PathwayEOI = {
    id: generateId(),
    name,
    email,
    submittedAt: new Date().toISOString(),
  };
  submissions.push(newSubmission);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.pathwayEOI, JSON.stringify(submissions));
  }
  return newSubmission;
};

export const getPathwayEOIs = (): PathwayEOI[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEYS.pathwayEOI);
  return data ? JSON.parse(data) : [];
};

// Email Subscriptions
export const saveEmailSubscription = (
  name: string,
  email: string
): EmailSubscription => {
  const subscriptions = getEmailSubscriptions();
  const newSubscription: EmailSubscription = {
    id: generateId(),
    name,
    email,
    subscribedAt: new Date().toISOString(),
  };
  subscriptions.push(newSubscription);
  if (typeof window !== "undefined") {
    localStorage.setItem(
      STORAGE_KEYS.emailSubscriptions,
      JSON.stringify(subscriptions)
    );
  }
  return newSubscription;
};

export const getEmailSubscriptions = (): EmailSubscription[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEYS.emailSubscriptions);
  return data ? JSON.parse(data) : [];
};

// Idea Submissions
export const saveIdeaSubmission = (
  idea: string,
  name?: string,
  email?: string
): IdeaSubmission => {
  const submissions = getIdeaSubmissions();
  const newSubmission: IdeaSubmission = {
    id: generateId(),
    name,
    email,
    idea,
    submittedAt: new Date().toISOString(),
  };
  submissions.push(newSubmission);
  if (typeof window !== "undefined") {
    localStorage.setItem(
      STORAGE_KEYS.ideaSubmissions,
      JSON.stringify(submissions)
    );
  }
  return newSubmission;
};

export const getIdeaSubmissions = (): IdeaSubmission[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEYS.ideaSubmissions);
  return data ? JSON.parse(data) : [];
};

// Export all data (for developer use)
export const exportAllData = () => {
  return {
    pathwayEOIs: getPathwayEOIs(),
    emailSubscriptions: getEmailSubscriptions(),
    ideaSubmissions: getIdeaSubmissions(),
    exportedAt: new Date().toISOString(),
  };
};

// Clear all data (for developer use)
export const clearAllData = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.pathwayEOI);
    localStorage.removeItem(STORAGE_KEYS.emailSubscriptions);
    localStorage.removeItem(STORAGE_KEYS.ideaSubmissions);
  }
};
