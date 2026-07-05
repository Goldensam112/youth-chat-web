export type Gender = "male" | "female" | "other";

export type User = {
  _id: string;
  name: string;
  age: number;
  gender: Gender;
  lookingFor: Gender[];
  bio: string;
  interests: string[];
  credits: number;
  isOnline: boolean;
  isFemaleVerified: boolean;
  profilePictures: { url: string; isPrimary: boolean }[];
};

export type Room = {
  _id: string;
  participants: User[] | string[];
  maleUser: string;
  femaleUser: string;
  sharedInterests: string[];
  status: "active" | "locked" | "closed";
  freeWindowStartedAt: string;
  freeWindowSeconds: number;
};

export type Message = {
  _id: string;
  room: string;
  sender: string;
  body: string;
  createdAt: string;
};

export type WalletTransaction = {
  _id: string;
  type: "signup_bonus" | "ad_reward" | "room_unlock" | "purchase";
  direction: "credit" | "debit";
  amount: number;
  balanceAfter: number;
  provider?: string;
  externalRef?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};
