// ---------------------------Capacity---------------------------
const firstCapacity = `
                    <div class="capacity-col-1">
                        <div class="capacity-image capacity-image-1">
                            <img
                                src="/assets/images/quality/capacity-1.png"
                                alt="quality 1"
                            />
                        </div>
                        <div class="capacity-image capacity-image-5">
                            <img
                                src="/assets/images/quality/capacity-5.png"
                                alt="quality 5"
                            />
                        </div>
                    </div>
                    <div class="capacity-col-1">
                        <div class="capacity-image capacity-image-2">
                            <img
                                src="/assets/images/quality/capacity-2.png"
                                alt="quality 2"
                            />
                        </div>
                        <div class="capacity-image capacity-image-6">
                            <img
                                src="/assets/images/quality/capacity-6.png"
                                alt="quality 6"
                            />
                        </div>
                    </div>
                    <div class="capacity-col-1">
                        <div class="capacity-image capacity-image-3">
                            <img
                                src="/assets/images/quality/capacity-3.png"
                                alt="quality 3"
                            />
                        </div>
                        <div class="capacity-image capacity-image-7">
                            <img
                                src="/assets/images/quality/capacity-7.png"
                                alt="quality 7"
                            />
                        </div>
                    </div>
                    <div class="capacity-col-1">
                        <div class="capacity-image capacity-image-4">
                            <img
                                src="/assets/images/quality/capacity-4.png"
                                alt="quality 4"
                            />
                        </div>
                        <div class="capacity-image capacity-image-8">
                            <img
                                src="/assets/images/quality/capacity-8.png"
                                alt="quality 8"
                            />
                        </div>
                    </div>`;
const secondCapacity = `
                    <div class="capacity-col-2 capacity-col-2-2">
                        <div class="capacity-image capacity-image-9">
                            <img
                                src="/assets/images/quality/capacity-9.png"
                                alt="quality 9"
                            />
                        </div>
                        <div class="capacity-image capacity-image-10">
                            <img
                                src="/assets/images/quality/capacity-10.png"
                                alt="quality 10"
                            />
                        </div>
                    </div>
                    <div class="capacity-col-2">
                        <div class="capacity-image capacity-image-11">
                            <img
                                src="/assets/images/quality/capacity-11.png"
                                alt="quality 11"
                            />
                        </div>
                    </div>`;
const thirdCapacity = `
                    <div class="capacity-col-2 capacity-col-2-3">
                        <div class="capacity-image capacity-image-12">
                            <img
                                src="/assets/images/quality/capacity-12.png"
                                alt="quality 12"
                            />
                        </div>
                    </div>
                    <div class="capacity-col-2 third-capacity">
                        <div class="capacity-image capacity-image-13">
                            <img
                                src="/assets/images/quality/capacity-13.png"
                                alt="quality 13"
                            />
                        </div>
                        <div class="capacity-image capacity-image-14">
                            <img
                                src="/assets/images/quality/capacity-14.png"
                                alt="quality 14"
                            />
                        </div>
                    </div>`;
const firstCapacityMobile = `
                    <div class="capacity-col-1">
                        <div class="capacity-image capacity-image-1">
                            <img
                                src="/assets/images/quality/capacity-1.png"
                                alt="quality 1"
                            />
                        </div>
                        <div class="capacity-image capacity-image-5">
                            <img
                                src="/assets/images/quality/capacity-5.png"
                                alt="quality 5"
                            />
                        </div>
                        <div class="capacity-image capacity-image-3">
                            <img
                                src="/assets/images/quality/capacity-3.png"
                                alt="quality 3"
                            />
                        </div>
                        <div class="capacity-image capacity-image-7">
                            <img
                                src="/assets/images/quality/capacity-7.png"
                                alt="quality 7"
                            />
                        </div>
                    </div>
                    <div class="capacity-col-1">
                        <div class="capacity-image capacity-image-2">
                            <img
                                src="/assets/images/quality/capacity-2.png"
                                alt="quality 2"
                            />
                        </div>
                        <div class="capacity-image capacity-image-6">
                            <img
                                src="/assets/images/quality/capacity-6.png"
                                alt="quality 6"
                            />
                        </div>
                        <div class="capacity-image capacity-image-4">
                            <img
                                src="/assets/images/quality/capacity-4.png"
                                alt="quality 4"
                            />
                        </div>
                        <div class="capacity-image capacity-image-8">
                            <img
                                src="/assets/images/quality/capacity-8.png"
                                alt="quality 8"
                            />
                        </div>
                    </div>`;
const secondCapacityMobile = `
                    <div class="capacity-col-2 capacity-col-2-2">
                        <div class="capacity-image capacity-image-9">
                            <img
                                src="/assets/images/quality/capacity-9.png"
                                alt="quality 9"
                            />
                        </div>
                        <div class="capacity-image capacity-image-10">
                            <img
                                src="/assets/images/quality/capacity-10.png"
                                alt="quality 10"
                            />
                        </div>
                        <div class="capacity-image capacity-image-11">
                            <img
                                src="/assets/images/quality/capacity-11.png"
                                alt="quality 11"
                            />
                        </div>
                    </div>`;
const thirdCapacityMobile = `
                    <div class="capacity-col-2 capacity-col-2-3">
                        <div class="capacity-image capacity-image-12">
                            <img
                                src="/assets/images/quality/capacity-12.png"
                                alt="quality 12"
                            />
                        </div>
                        <div class="capacity-image capacity-image-13">
                            <img
                                src="/assets/images/quality/capacity-13.png"
                                alt="quality 13"
                            />
                        </div>
                        <div class="capacity-image capacity-image-14">
                            <img
                                src="/assets/images/quality/capacity-14.png"
                                alt="quality 14"
                            />
                        </div>
                    </div>`;

const capacityImageWrapper = document.querySelector('.capacity-image-wrapper');
const capacity = document.querySelectorAll('.capacity-button-item');

if (window.innerWidth <= 600) {
    capacityImageWrapper.innerHTML = firstCapacityMobile;
} else {
    capacityImageWrapper.innerHTML = firstCapacity;
}

const handleClickCapacity = (index) => {
    switch (index) {
        case 0:
            capacityImageWrapper.innerHTML =
                window.innerWidth <= 600 ? firstCapacityMobile : firstCapacity;
            break;
        case 1:
            capacityImageWrapper.innerHTML =
                window.innerWidth <= 600
                    ? secondCapacityMobile
                    : secondCapacity;
            break;
        case 2:
            capacityImageWrapper.innerHTML =
                window.innerWidth <= 600 ? thirdCapacityMobile : thirdCapacity;
            break;
    }
};

const removeActiveClass = () => {
    capacity?.forEach((item) => {
        item.classList.remove('active');
    });
};

capacity?.forEach((item, index) => {
    item.addEventListener('click', () => {
        removeActiveClass();
        item.classList.add('active');
        handleClickCapacity(index);
    });
});
