import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Compute dynamic header heights that include safe area top inset so header background
 * fully covers status bar / notch across devices.
 * @param expandedBodyHeight height of the header content area (excluding safe top) when expanded
 * @param collapsedVisibleHeight visible header (excluding safe top) when collapsed (e.g. tabs bar)
 */
export default function useHeaderHeights(
  expandedBodyHeight: number = 180,
  collapsedVisibleHeight: number = 62
) {
  const insets = useSafeAreaInsets();
  const expanded = insets.top + expandedBodyHeight;
  const collapsed = insets.top + collapsedVisibleHeight;
  const distance = expanded - collapsed;
  return { expanded, collapsed, distance, topInset: insets.top };
}
