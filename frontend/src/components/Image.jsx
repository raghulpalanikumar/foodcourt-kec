import React, { useState, useEffect } from 'react';

const Image = ({ src, alt, className, fallback, ...props }) => {
    const [imgSrc, setImgSrc] = useState(src);
    const defaultFallback = '/assets/no-image-placeholder.svg';

    useEffect(() => {
        setImgSrc(src);
    }, [src]);

    const handleError = () => {
        if (imgSrc !== (fallback || defaultFallback)) {
            setImgSrc(fallback || defaultFallback);
        }
    };

    return (
        <img
            src={imgSrc || defaultFallback}
            alt={alt || 'Image'}
            className={className}
            onError={handleError}
            {...props}
        />
    );
};

export default Image;
