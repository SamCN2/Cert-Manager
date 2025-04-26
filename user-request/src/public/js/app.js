/**
 * Copyright (c) 2025 ogt11.com, llc
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize top app bar
    const topAppBar = document.querySelector('.mdc-top-app-bar');
    if (topAppBar) {
        mdc.topAppBar.MDCTopAppBar.attachTo(topAppBar);
    }

    // Initialize all text fields
    const textFields = document.querySelectorAll('.mdc-text-field');
    textFields.forEach(textField => {
        mdc.textField.MDCTextField.attachTo(textField);
    });

    // Initialize all buttons with ripple effect
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

    // Initialize form validation
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', (event) => {
            if (!form.checkValidity()) {
                event.preventDefault();
                // Add was-validated class to show validation feedback
                form.classList.add('was-validated');
            }
        });

        // Add username availability check
        const usernameInput = form.querySelector('input[name="username"]');
        if (usernameInput) {
            usernameInput.addEventListener('blur', async () => {
                const username = usernameInput.value.trim();
                if (username) {
                    try {
                        const response = await fetch(`/api/user-admin/users/check-username/${username}`);
                        const data = await response.json();
                        
                        const feedback = usernameInput.parentElement.querySelector('.mdc-text-field-helper-text');
                        if (feedback) {
                            feedback.textContent = data.available ? 'Username is available' : 'Username is not available';
                            feedback.classList.toggle('mdc-text-field-helper-text--validation-msg', !data.available);
                        }
                        
                        usernameInput.setCustomValidity(data.available ? '' : 'Username is not available');
                    } catch (error) {
                        console.error('Error checking username:', error);
                    }
                }
            });
        }
    }
}); 