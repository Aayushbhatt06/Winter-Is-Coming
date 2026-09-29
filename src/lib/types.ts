export type Goal = { id: string; name: string; category: string; frequency: "daily" | "weekly" };
export type TrackerOptions = { weight: boolean; mood: boolean; sleep: boolean; photo: boolean; progressPhoto: boolean };
export type Profile = { _id: string; name: string; email: string; startDate: string; endDate: string; theme: string; goals: Goal[]; trackers: TrackerOptions; photoUrl?: string };
export type Checkin = { date: string; goalIds: string[]; weight?: number; mood?: number; sleep?: number; note?: string };
export type ProgressPhoto = { date: string; photoUrl: string; publicId?: string };
export type TrackerEntry = { date: string; weight?: number; mood?: number; sleep?: number };
