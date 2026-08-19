'use client';

interface AppSettingsProviderProps {
    children: React.ReactNode;
}

export default function AppSettingsProvider({ children }: AppSettingsProviderProps) {
    return <>{children}</>;
}
