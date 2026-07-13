import {
  AtSign, CircleUserRound, Facebook, File, Github, Globe2, Instagram, Linkedin, Link as LinkIcon,
  MapPin, MessageCircle, Music2, Phone, Send, Share2, ShoppingBag, UserRoundPlus, Video, type LucideIcon,
} from "lucide-react";
import { defaultIconKeys, type DestinationTypeValue } from "@popwam/shared";

const icons: Record<string, LucideIcon> = {
  profile: CircleUserRound, whatsapp: MessageCircle, phone: Phone, email: AtSign, website: Globe2,
  contact: UserRoundPlus, facebook: Facebook, linkedin: Linkedin, github: Github, tiktok: Music2,
  instagram: Instagram, x: AtSign, youtube: Video, telegram: Send, location: MapPin, file: File,
  social: Share2, custom: LinkIcon, link: LinkIcon, shopping: ShoppingBag,
};

export function DestinationIcon({ type, iconKey, className }: { type: DestinationTypeValue; iconKey?: string | null; className?: string }) {
  const Icon = icons[iconKey || defaultIconKeys[type]] || LinkIcon;
  return <Icon aria-hidden="true" className={className} size={20}/>;
}
