import React, { useState } from 'react';
import { IconButton, Tooltip, Snackbar } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';

const ShareButton = ({ system, frequency }) => {
    const [open, setOpen] = useState(false);

    const handleShare = async () => {
        const url = new URL(window.location.href);
        url.searchParams.set('custom', '1');
        url.searchParams.set('system', system);
        url.searchParams.set('freq', frequency.toString());

        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Tuning Explorer Configuration',
                    text: `Check out this tuning configuration: ${system} at ${frequency}Hz`,
                    url: url.toString()
                });
            } else {
                await navigator.clipboard.writeText(url.toString());
                setOpen(true);
            }
        } catch (error) {
            console.warn('Share failed:', error);
        }
    };

    return (
        <>
            <Tooltip title="Share configuration">
                <IconButton onClick={handleShare} color="primary">
                    <ShareIcon />
                </IconButton>
            </Tooltip>
            <Snackbar
                open={open}
                autoHideDuration={3000}
                onClose={() => setOpen(false)}
                message="URL copied to clipboard!"
            />
        </>
    );
};

export default ShareButton; 