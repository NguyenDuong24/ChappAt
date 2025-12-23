import React, { useState, useEffect } from 'react';
import { InteractionManager, View, ActivityIndicator, StyleSheet } from 'react-native';

interface DeferredComponentProps {
    children: React.ReactNode;
    loadingComponent?: React.ReactNode;
}

const DeferredComponent: React.FC<DeferredComponentProps> = ({ children, loadingComponent }) => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            setReady(true);
        });

        return () => task.cancel();
    }, []);

    if (!ready) {
        return (
            <View style={styles.container}>
                {loadingComponent || null}
            </View>
        );
    }

    return <>{children}</>;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default DeferredComponent;
