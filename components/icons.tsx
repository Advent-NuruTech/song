import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { ComponentProps, ComponentType } from "react";

export type IconProps = Omit<ComponentProps<typeof Feather>, "name"> & {
  fill?: string;
};

export type LucideIcon = ComponentType<IconProps>;

function featherIcon(name: ComponentProps<typeof Feather>["name"]): LucideIcon {
  function AppIcon({ fill: _fill, ...props }: IconProps) {
    return <Feather name={name} {...props} />;
  }
  AppIcon.displayName = `AppIcon(${name})`;
  return AppIcon;
}

export const Check = featherIcon("check");
export const ChevronLeft = featherIcon("chevron-left");
export const ChevronRight = featherIcon("chevron-right");
export const Copy = featherIcon("copy");
export const Heart: LucideIcon = ({ fill, ...props }) => (
  <FontAwesome
    name={fill && fill !== "transparent" ? "heart" : "heart-o"}
    {...props}
  />
);
export const MessageCircle = featherIcon("message-circle");
export const Search = featherIcon("search");
export const Send = featherIcon("send");
export const Share2 = featherIcon("share-2");
export const Trash2 = featherIcon("trash-2");
export const X = featherIcon("x");
