// ---------------------------Navigate---------------------------
const ourCustomer = document.querySelector('.about-content');

const handleClickOurCustomer = () => {
    localStorage.setItem('gallery', '2');
    window.location.href = '/gallery.html#gallery-section';
};

ourCustomer.addEventListener('click', handleClickOurCustomer);

// ---------------------------Slider---------------------------
let productsSwiper;
let hrsSwiper;
let customersSwiper;
if (window.innerWidth <= 600) {
    productsSwiper = new Swiper('.productsSwiper', {
        slidesPerView: 2,
        spaceBetween: 20,
        loop: true,
        autoplay: {
            delay: 2500,
            disableOnInteraction: false,
        },
    });
    hrsSwiper = new Swiper('.hrsSwiper', {
        slidesPerView: 1,
        spaceBetween: 0,
        loop: true,
        autoplay: {
            delay: 2500,
            disableOnInteraction: false,
        },
    });
    customersSwiper = new Swiper('.customersSwiper', {
        slidesPerView: 1,
        spaceBetween: 0,
        loop: true,
        autoplay: {
            delay: 2500,
            disableOnInteraction: false,
        },
    });
} else {
    productsSwiper = new Swiper('.productsSwiper', {
        slidesPerView: 4,
        spaceBetween: 40,
        loop: true,
        autoplay: {
            delay: 2500,
            disableOnInteraction: false,
        },
    });
    hrsSwiper = new Swiper('.hrsSwiper', {
        slidesPerView: 1,
        spaceBetween: 0,
        loop: true,
        autoplay: {
            delay: 2500,
            disableOnInteraction: false,
        },
    });
    customersSwiper = new Swiper('.customersSwiper', {
        slidesPerView: 1,
        spaceBetween: 40,
        loop: true,
        autoplay: {
            delay: 2500,
            disableOnInteraction: false,
        },
        speed: 800,
    });
}

// ---------------------------Click products---------------------------
const products = document.querySelectorAll('.product-column');

const handleClickProduct = (event) => {
    const itemOrder =
        event.target?.closest('.product-column')?.classList[1]?.split('-')[2] ??
        '1';

    switch (itemOrder) {
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
            window.location.href = `/products.html#product-${itemOrder}`;
            break;
    }
};

if (products) {
    products.forEach((product) => {
        product.addEventListener('click', ($event) =>
            handleClickProduct($event)
        );
    });
}
