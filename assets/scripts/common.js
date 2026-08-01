// ---------------------------Phone call---------------------------
const socialIcon = document.querySelector('.phone-call');

const showContactInfo = function () {
    const popup = document.querySelector('.contact-popup');
    const overlay = document.querySelector('.overlay');
    if (popup && overlay) {
        popup.style.display = 'block';
        overlay.style.display = 'block';
        setTimeout(() => {
            const closeButton = popup.querySelector('.contact-icon');
            closeButton.addEventListener('click', () => {
                popup.classList.add('contact-popup-out');
                setTimeout(() => {
                    popup.classList.remove('contact-popup-out');
                    popup.style.display = 'none';
                    overlay.style.display = 'none';
                }, 300);
            });
        }, 10);
    }
};

if (socialIcon) {
    socialIcon.addEventListener('click', showContactInfo);
}

const overlay = document.querySelector('.overlay');

overlay.addEventListener('click', () => {
    const popup = document.querySelector('.contact-popup');
    if (popup) {
        popup.classList.add('contact-popup-out');
        setTimeout(() => {
            popup.classList.remove('contact-popup-out');
            popup.style.display = 'none';
            overlay.style.display = 'none';
        }, 300);
    }
});

// ---------------------------Footer---------------------------
const footerItem = document.querySelectorAll('.footer-sublink-item');

const handleClickFooterItem = (index, event) => {
    event.preventDefault();
    if (index === 0 || index === 1 || index === 2 || index === 3) {
        localStorage.setItem('footer-item', `${index + 1}`);
    } else if (
        index === 4 ||
        index === 5 ||
        index === 6 ||
        index === 7 ||
        index === 8 ||
        index === 9 ||
        index === 10 ||
        index === 11
    ) {
        localStorage.setItem('footer-item', `${index - 4 + 1}`);
    } else if (index === 12 || index === 13 || index === 14 || index === 15) {
        localStorage.setItem('footer-item', `${index - 8 + 1}`);
    }
    switch (index) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
            setTimeout(() => {
                window.location.href = '/products.html#product-4';
            }, 100);
            break;
        case 8:
        case 9:
        case 10:
        case 11:
        case 12:
        case 13:
        case 14:
        case 15:
            setTimeout(() => {
                window.location.href = '/products.html#product-5';
            }, 100);
            break;
    }
};

footerItem.forEach((element, index) => {
    element.addEventListener('click', ($event) =>
        handleClickFooterItem(index, $event)
    );
});

const mobileWrapper = document.querySelectorAll('.footer-mobile-wrapper');

mobileWrapper.forEach((item) => {
    item.addEventListener('click', (event) => {
        const wrapper = event.target.closest('.footer-mobile-wrapper');
        const image = wrapper.querySelector('img');
        const linkItems = wrapper
            .closest('.footer-links')
            ?.querySelectorAll('.footer-mobile-item');

        if (image?.src?.includes('arrow-down')) {
            image.src = '/assets/icons/arrow-up-white.png';
            linkItems.forEach((linkItem) => {
                linkItem.style.display = 'block';
            });
        } else if (image?.src?.includes('arrow-up')) {
            image.src = '/assets/icons/arrow-down-white.png';
            linkItems.forEach((linkItem) => {
                linkItem.style.display = 'none';
            });
        }
    });
});

const subscribeButton = document.querySelector('.subscribe-button');
const theInput = document.querySelector('.newsletter-input.input-email');

if (subscribeButton && theInput) {
    subscribeButton.addEventListener('click', (event) => {
        event.preventDefault();
        const theValue = theInput.value;
        if (!theValue) {
            theInput.style.border = '1px solid #28FF90';
            theInput.style.setProperty('--placeholder-color', '#28FF90');

            const style = document.createElement('style');
            style.innerHTML = `
                    input::placeholder {
                        color: #28FF90;
                    }
                `;
            document.head.appendChild(style);
        } else {
            const firstFooterItem = document.querySelector(
                '.newsletter-wrapper div:nth-child(1)'
            );

            if (firstFooterItem) {
                firstFooterItem.innerHTML = `
                    <p class="subscribe-text">Thank you!</p>
                `;
            }
        }
    });

    theInput.addEventListener('input', () => {
        theInput.style.border = '1px solid #7f7e98';
        theInput.style.setProperty('--placeholder-color', '#7f7e98');

        const style = document.createElement('style');
        style.innerHTML = `
                input::placeholder {
                    color: #7f7e98;
                }
            `;
        document.head.appendChild(style);
    });
}

// ---------------------------Popup search---------------------------
const searchBar = document.querySelector('.search-bar');
const searchBarMobile = document.querySelector('.search-mobile');

const handleClickSearch = () => {
    const searchPopup = document.querySelector('.search-popup');
    const theOverlay = document.querySelector('.search-popup-overlay');
    if (searchPopup && theOverlay) {
        searchPopup.style.display = 'flex';
        theOverlay.style.display = 'block';

        const cancelButton = searchPopup.querySelector('.search-popup-cancel');
        const cancelButtonMobile = searchPopup.querySelector(
            '.search-popup-cancel-mobile'
        );
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                searchPopup.style.display = 'none';
                theOverlay.style.display = 'none';
            });
        }
        if (cancelButtonMobile) {
            cancelButtonMobile.addEventListener('click', () => {
                searchPopup.style.display = 'none';
                theOverlay.style.display = 'none';
            });
        }
    }
};

if (searchBar) {
    searchBar.addEventListener('click', () => handleClickSearch());
}

if (searchBarMobile) {
    searchBarMobile.addEventListener('click', () => handleClickSearch());
}

// ---------------------------Nav Mobile---------------------------
const navMenu = document.querySelector('.nav-menu');

const handleClickNavMenu = () => {
    const menuPopup = document.querySelector('.nav-menu-popup');
    const iconNavMenu = navMenu.querySelector('img');

    if (menuPopup && iconNavMenu) {
        if (iconNavMenu.src?.includes('navs-mobile')) {
            iconNavMenu.src = '/assets/icons/cancel-mobile.png';
            menuPopup.style.display = 'block';
        } else if (iconNavMenu.src?.includes('cancel-mobile')) {
            iconNavMenu.src = '/assets/icons/navs-mobile.png';
            menuPopup.style.display = 'none';
        }
    }
};

if (navMenu) {
    navMenu.addEventListener('click', () => handleClickNavMenu());
}

const dropdownProducts = document.querySelector(
    '.navigation-bar-mobile .nav-menu-popup .nav-link-product'
);

if (dropdownProducts) {
    dropdownProducts.addEventListener('click', () => {
        const popoverProducts = document.querySelector(
            '.navigation-bar-mobile .popover-products'
        );
        const popoverArrow = document.querySelector('.nav-link-product img');
        if (popoverProducts?.classList?.value?.includes('hidden')) {
            popoverProducts.classList.remove('hidden');
            popoverProducts.classList.add('show');
            popoverArrow.src = '/assets/icons/arrow-up.png';
        } else if (popoverProducts?.classList?.value?.includes('show')) {
            popoverProducts.classList.remove('show');
            popoverProducts.classList.add('hidden');
            popoverArrow.src = '/assets/icons/arrow-down.png';
        }
    });
}
