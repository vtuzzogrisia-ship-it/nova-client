import { LucideIcon } from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export type Mod = {
  id: string;
  name: string;
  category: "Performance" | "HUD" | "Gameplay";
  description: string;
  enabled: boolean;
  status: string;
};

export type CatalogItem = {
  id: string | number;
  name: string;
  summary: string;
  icon?: string;
  url: string;
  downloads?: number;
  source: "Modrinth" | "CurseForge";
};

export type ModUpdate = {
  projectId: string;
  currentFile: string;
  latestFile: string;
  versionId: string;
};

export type JavaRuntime = {
  available: boolean;
  executable?: string;
  version?: string;
  major?: number;
  error?: string;
};

export type MinecraftVersionEntry = {
  id: string;
  type: string;
  url: string;
};

export type GameInstanceEntry = {
  name: string;
  version: string;
  loader: string;
  path: string;
};

export type NovaFriend = {
  id: string;
  name: string;
  host: string;
  port: number;
};

export type NovaFriendRequest = {
  senderId: string;
  senderName: string;
  senderHost: string;
  senderPort: number;
};

export type NovaDirectMessage = {
  id: string;
  friendId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
  outgoing: boolean;
  failed?: boolean;
};

export type NovaInvite = {
  id: string;
  senderId: string;
  senderName: string;
  serverName: string;
  serverAddress: string;
  createdAt: number;
};

export type NovaSocialPacket = {
  kind: string;
  senderId: string;
  senderName: string;
  senderHost?: string;
  senderPort?: number;
  text?: string;
  serverName?: string;
  serverAddress?: string;
  createdAt?: number;
};

export type NovaProfile = {
  id: string;
  name: string;
  version: string;
  loader: string;
  ram: number;
};

export type NovaServer = {
  id: string;
  name: string;
  address: string;
};

export type MinecraftServerStatus = {
  online: boolean;
  latencyMs: number;
  version: string;
  playersOnline: number;
  playersMax: number;
  description: string;
};
