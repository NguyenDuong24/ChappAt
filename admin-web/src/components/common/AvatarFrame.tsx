import React, { useMemo } from 'react';

interface AvatarFrameProps {
    avatarUrl: string;
    frameType?: string;
    size?: number;
    username?: string;
}

const FRAME_IMAGES: Record<string, string> = {
    money: '/frames/frame_money.png',
    ocean: '/frames/frame_ocean.png',
    devil: '/frames/frame_devil_v2.png',
    ufo: '/frames/frame_ufo.png',
    elegant: '/frames/frame_elegant.png',
    japan: '/frames/frame_japan.png',
    dragon: '/frames/frame_dragon_v2.png',
    phoenix: '/frames/frame_phoenix_v2.png',
    cyberpunk: '/frames/frame_cyberpunk_v2.png',
    galaxy: '/frames/frame_galaxy_v2.png',
};

const AvatarFrame: React.FC<AvatarFrameProps> = ({
    avatarUrl,
    frameType,
    size = 40,
    username = 'User',
}) => {
    const normalizedFrame = (frameType || '').toLowerCase();
    const filterId = useMemo(() => `filter-${Math.random().toString(36).substr(2, 9)}`, []);
    const maskId = useMemo(() => `mask-${Math.random().toString(36).substr(2, 9)}`, []);

    const isLargeFrame = ['devil', 'dragon', 'phoenix', 'galaxy'].includes(normalizedFrame);
    const extraPadding = isLargeFrame ? size * 0.4 : 0;
    const strokeWidth = size * 0.15;
    const totalSize = frameType ? (size + strokeWidth * 2 + extraPadding) : size;
    const center = totalSize / 2;
    const offset = (totalSize - size) / 2;

    const renderFrame = () => {
        if (normalizedFrame === 'gamer') {
            return (
                <svg
                    width={totalSize}
                    height={totalSize}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        pointerEvents: 'none',
                        zIndex: 2
                    }}
                    className="spin-anim"
                >
                    <defs>
                        <linearGradient id="gamerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#00FFFF" />
                            <stop offset="100%" stopColor="#FF00FF" />
                        </linearGradient>
                    </defs>
                    <circle
                        cx={center}
                        cy={center}
                        r={(size + strokeWidth) / 2}
                        stroke="url(#gamerGrad)"
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray="20,10"
                    />
                </svg>
            );
        }

        if (!frameType || !FRAME_IMAGES[normalizedFrame]) return null;

        const isAnimatedRotation = ['ocean', 'ufo', 'cyberpunk', 'galaxy'].includes(normalizedFrame);
        const isAnimatedPulse = ['money', 'devil', 'elegant', 'japan', 'dragon', 'phoenix'].includes(normalizedFrame);
        const needsFilter = ['devil', 'dragon', 'phoenix', 'cyberpunk', 'galaxy'].includes(normalizedFrame);

        const animationClass = isAnimatedRotation ? 'spin-anim' : isAnimatedPulse ? 'pulse-anim' : '';

        return (
            <svg
                width={totalSize}
                height={totalSize}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    pointerEvents: 'none',
                    zIndex: 2
                }}
                className={animationClass}
            >
                <defs>
                    <filter id={filterId}>
                        <feColorMatrix
                            type="matrix"
                            values="1 0 0 0 0
                                    0 1 0 0 0
                                    0 0 1 0 0
                                    2 2 2 0 0"
                        />
                    </filter>
                    <mask id={maskId}>
                        <circle cx={center} cy={center} r={totalSize / 2} fill="white" />
                        <circle cx={center} cy={center} r={size / 2} fill="black" />
                    </mask>
                </defs>
                <image
                    href={FRAME_IMAGES[normalizedFrame]}
                    width={totalSize}
                    height={totalSize}
                    preserveAspectRatio="xMidYMid slice"
                    mask={`url(#${maskId})`}
                    filter={needsFilter ? `url(#${filterId})` : undefined}
                />
            </svg>
        );
    };

    return (
        <div style={{
            position: 'relative',
            width: totalSize,
            height: totalSize,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        }}>
            <style>
                {`
                    @keyframes spin-anim { 100% { transform: rotate(360deg); } }
                    @keyframes pulse-anim { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
                    .spin-anim { animation: spin-anim 4s linear infinite; transform-origin: center; }
                    .pulse-anim { animation: pulse-anim 3s ease-in-out infinite; transform-origin: center; }
                `}
            </style>

            {/* Avatar Image */}
            <div style={{
                width: size,
                height: size,
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'absolute',
                top: offset,
                left: offset,
                zIndex: 1
            }}>
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={username}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                ) : (
                    <span style={{ fontSize: size * 0.5, color: '#999' }}>
                        {username[0]?.toUpperCase()}
                    </span>
                )}
            </div>

            {/* Frame Overlay */}
            {renderFrame()}
        </div>
    );
};

export default AvatarFrame;
