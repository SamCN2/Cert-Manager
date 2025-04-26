/**
 * Copyright (c) 2025 ogt11.com, llc
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all MDC components
    const topAppBar = document.querySelector('.mdc-top-app-bar');
    if (topAppBar) {
        mdc.topAppBar.MDCTopAppBar.attachTo(topAppBar);
    }

    // Initialize ripple effect on buttons
    const buttons = document.querySelectorAll('.mdc-button');
    buttons.forEach(button => {
        mdc.ripple.MDCRipple.attachTo(button);
    });

    // Initialize banner if present
    const banner = document.querySelector('.mdc-banner');
    if (banner) {
        const mdcBanner = new mdc.banner.MDCBanner(banner);
        mdcBanner.open();
        
        // Add click handler for dismiss button
        const dismissButton = banner.querySelector('.mdc-banner__primary-action');
        if (dismissButton) {
            dismissButton.addEventListener('click', () => {
                mdcBanner.close();
            });
        }
    }

    // Initialize cards with ripple effect
    const cardPrimaryActions = document.querySelectorAll('.mdc-card__primary-action');
    cardPrimaryActions.forEach(cardPrimaryAction => {
        mdc.ripple.MDCRipple.attachTo(cardPrimaryAction);
    });

    // Initialize data table if present
    const dataTable = document.querySelector('.mdc-data-table');
    if (dataTable) {
        mdc.dataTable.MDCDataTable.attachTo(dataTable);
    }

    // Initialize chips if present
    const chips = document.querySelectorAll('.mdc-chip');
    chips.forEach(chip => {
        mdc.chips.MDCChip.attachTo(chip);
    });
}); 