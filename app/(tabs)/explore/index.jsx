import { useTheme } from '@/context/ThemeContext';
import LiquidScreen from '@/components/liquid/LiquidScreen';
import Tab1Screen from './tab1';

export default function ExploreTab() {
    const { theme } = useTheme();
    return (
        <LiquidScreen themeMode={theme}>
            <Tab1Screen isActive={true} />
        </LiquidScreen>
    );
}
