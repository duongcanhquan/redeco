// ---------------------------Navigate---------------------------
const ourCustomer = document.querySelector('.about-content');

const handleClickOurCustomer = () => {
    localStorage.setItem('gallery', '2');
    window.location.href = '/gallery.html#gallery-section';
};

ourCustomer.addEventListener('click', handleClickOurCustomer);

// ---------------------------Slider---------------------------
let customersSwiper = new Swiper('.customersSwiper', {
    slidesPerView: 1,
    spaceBetween: 40,
    loop: true,
    autoplay: {
        delay: 2500,
        disableOnInteraction: false,
    },
    speed: 800,
});

// ---------------------------History---------------------------
const historyWrapper = document.querySelector('.about-history-content');
const historyWrapperMobile = document.querySelector(
    '.about-history-content-mobile'
);
let historiesSwiper;
if (window.innerWidth <= 600) {
    if (historyWrapper && historyWrapperMobile) {
        historyWrapper.style.display = 'none';
        historyWrapperMobile.style.display = 'block';
    }
    historiesSwiper = new Swiper('.historiesSwiper', {
        slidesPerView: 1,
        spaceBetween: 0,
        loop: true,
        autoplay: {
            delay: 2500,
            disableOnInteraction: false,
        },
    });
} else if (historyWrapper && historyWrapperMobile) {
    historyWrapper.style.display = 'block';
    historyWrapperMobile.style.display = 'none';
}

// ---------------------------Text Effect---------------------------
const numberWrapper = document.querySelector('.section-stats');
const numberElements = document.getElementsByClassName('stat-number');
let hasAnimated = false;

const animateNumber = () => {
    if (hasAnimated) return;
    hasAnimated = true;

    let count_1 = 0;
    let count_2 = 0;
    let count_3 = 0;
    let count_4 = 0;
    const number_1 = 8;
    const number_2 = 50;
    const number_3 = 45;
    const number_4 = 100;

    const interval_1 = setInterval(() => {
        if (count_1 >= number_1) {
            clearInterval(interval_1);
        } else {
            count_1++;
            numberElements[0].textContent = `0${count_1}`;
        }
    }, 80);

    const interval_2 = setInterval(() => {
        if (count_2 >= number_2) {
            clearInterval(interval_2);
        } else {
            count_2++;
            numberElements[1].textContent = count_2;
        }
    }, 40);

    const interval_3 = setInterval(() => {
        if (count_3 >= number_3) {
            clearInterval(interval_3);
        } else {
            count_3++;
            numberElements[2].textContent = count_3;
        }
    }, 40);

    const interval_4 = setInterval(() => {
        if (count_4 >= number_4) {
            clearInterval(interval_4);
        } else {
            count_4++;
            numberElements[3].textContent = count_4;
        }
    }, 22);
};

window.addEventListener('scroll', () => {
    const rect = numberWrapper.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom >= 0) {
        animateNumber();
    }
});

// ---------------------------Details button---------------------------
const detailsButton = document.querySelector('.about-details-btn');

if (detailsButton) {
    const detailContents = document.querySelectorAll('.details-content');

    detailsButton.addEventListener('click', () => {
        detailContents.forEach((item) => {
            item.style.display = 'block';
        });

        setTimeout(() => {
            detailsButton.style.display = 'none';
        }, 100);
    });
}
