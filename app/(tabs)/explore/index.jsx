import React from 'react';
import Tab1Screen from './tab1';
import DeferredComponent from '@/components/DeferredComponent';

export default function ExploreTab() {
    return (
        <DeferredComponent>
            <Tab1Screen />
        </DeferredComponent>
    );
}
