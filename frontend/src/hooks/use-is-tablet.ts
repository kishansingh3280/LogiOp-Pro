import { useWindowDimensions } from "react-native";

import { TABLET_WIDTH } from "@/src/theme";

export function useIsTablet() {
  const { width } = useWindowDimensions();
  return width >= TABLET_WIDTH;
}
