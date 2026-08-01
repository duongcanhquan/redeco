const COUNTRIES = [
    'Afghanistan',
    'Albania',
    'Algeria',
    'Andorra',
    'Angola',
    'Antigua and Barbuda',
    'Argentina',
    'Armenia',
    'Australia',
    'Austria',
    'Azerbaijan',
    'Bahamas',
    'Bahrain',
    'Bangladesh',
    'Barbados',
    'Belarus',
    'Belgium',
    'Belize',
    'Benin',
    'Bhutan',
    'Bolivia',
    'Bosnia and Herzegovina',
    'Botswana',
    'Brazil',
    'Brunei',
    'Bulgaria',
    'Burkina Faso',
    'Burundi',
    'Cabo Verde',
    'Cambodia',
    'Cameroon',
    'Canada',
    'Central African Republic',
    'Chad',
    'Chile',
    'China',
    'Colombia',
    'Comoros',
    'Congo, Democratic Republic of the',
    'Congo, Republic of the',
    'Costa Rica',
    'Croatia',
    'Cuba',
    'Cyprus',
    'Czech Republic',
    'Denmark',
    'Djibouti',
    'Dominica',
    'Dominican Republic',
    'Ecuador',
    'Egypt',
    'El Salvador',
    'Equatorial Guinea',
    'Eritrea',
    'Estonia',
    'Eswatini',
    'Ethiopia',
    'Fiji',
    'Finland',
    'France',
    'Gabon',
    'Gambia',
    'Georgia',
    'Germany',
    'Ghana',
    'Greece',
    'Grenada',
    'Guatemala',
    'Guinea',
    'Guinea-Bissau',
    'Guyana',
    'Haiti',
    'Honduras',
    'Hungary',
    'Iceland',
    'India',
    'Indonesia',
    'Iran',
    'Iraq',
    'Ireland',
    'Israel',
    'Italy',
    'Jamaica',
    'Japan',
    'Jordan',
    'Kazakhstan',
    'Kenya',
    'Kiribati',
    'Korea, North',
    'Korea, South',
    'Kuwait',
    'Kyrgyzstan',
    'Laos',
    'Latvia',
    'Lebanon',
    'Lesotho',
    'Liberia',
    'Libya',
    'Liechtenstein',
    'Lithuania',
    'Luxembourg',
    'Madagascar',
    'Malawi',
    'Malaysia',
    'Maldives',
    'Mali',
    'Malta',
    'Marshall Islands',
    'Mauritania',
    'Mauritius',
    'Mexico',
    'Micronesia',
    'Moldova',
    'Monaco',
    'Mongolia',
    'Montenegro',
    'Morocco',
    'Mozambique',
    'Myanmar',
    'Namibia',
    'Nauru',
    'Nepal',
    'Netherlands',
    'New Zealand',
    'Nicaragua',
    'Niger',
    'Nigeria',
    'North Macedonia',
    'Norway',
    'Oman',
    'Pakistan',
    'Palau',
    'Palestine',
    'Panama',
    'Papua New Guinea',
    'Paraguay',
    'Peru',
    'Philippines',
    'Poland',
    'Portugal',
    'Qatar',
    'Romania',
    'Russia',
    'Rwanda',
    'Saint Kitts and Nevis',
    'Saint Lucia',
    'Saint Vincent and the Grenadines',
    'Samoa',
    'San Marino',
    'Sao Tome and Principe',
    'Saudi Arabia',
    'Senegal',
    'Serbia',
    'Seychelles',
    'Sierra Leone',
    'Singapore',
    'Slovakia',
    'Slovenia',
    'Solomon Islands',
    'Somalia',
    'South Africa',
    'South Sudan',
    'Spain',
    'Sri Lanka',
    'Sudan',
    'Suriname',
    'Sweden',
    'Switzerland',
    'Syria',
    'Tajikistan',
    'Tanzania',
    'Thailand',
    'Timor-Leste',
    'Togo',
    'Tonga',
    'Trinidad and Tobago',
    'Tunisia',
    'Turkey',
    'Turkmenistan',
    'Tuvalu',
    'Uganda',
    'Ukraine',
    'United Arab Emirates',
    'United Kingdom',
    'United States',
    'Uruguay',
    'Uzbekistan',
    'Vanuatu',
    'Vatican City',
    'Venezuela',
    'Vietnam',
    'Yemen',
    'Zambia',
    'Zimbabwe',
];

const CATEGORIES = [
    'Customer/Dealer',
    'Discount Policy',
    'Parts Information',
    'Quote/Purchase',
    'Access & Register',
    'Operator/Service Training',
    'Potential Supplier',
    'Merchandise',
    'Product Detail Information',
    'Product Service/Maintenance',
    'Other',
];

// ---------------------------Submit form---------------------------
document.getElementById('myForm')?.addEventListener('submit', function (event) {
    event.preventDefault();
    const loading = document.getElementById('loading');
    const fields = [
        { id: 'firstName', errorId: 'error-firstName', label: 'First Name' },
        { id: 'lastName', errorId: 'error-lastName', label: 'Last Name' },
        { id: 'email', errorId: 'error-email', label: 'Email' },
        { id: 'phone', errorId: 'error-phone', label: 'Phone' },
        { id: 'address', errorId: 'error-address', label: 'Address' },
        { id: 'city', errorId: 'error-city', label: 'City' },
        { id: 'zip', errorId: 'error-zip', label: 'ZIP/Postal Code' },
        { id: 'country', errorId: 'error-country', label: 'Country or Region' },
        { id: 'category', errorId: 'error-category', label: 'Category' },
        { id: 'message', errorId: 'error-message', label: 'Message' },
    ];

    for (let { id, errorId, label } of fields) {
        const input = document.getElementById(id);
        const errorElement = document.getElementById(errorId);
        const value = input ? input.value.trim() : '';

        if (
            (id === 'country' && !COUNTRIES.includes(value)) ||
            (id === 'category' && !CATEGORIES.includes(value))
        ) {
            input.parentNode.style.borderColor = 'red';
            errorElement.innerHTML = `${label} is invalid.`;
            return;
        } else {
            input.parentNode.style.borderColor = '#00366a';
            errorElement.innerHTML = '';
        }

        if (!value) {
            input.style.borderColor = 'red';
            errorElement.innerHTML = `${label} cannot be empty.`;
            input?.focus();
            return;
        } else {
            input.style.borderColor = '#00366a';
            errorElement.innerHTML = '';
        }
    }

    loading.style.display = 'flex';
    loading.style.justifyContent = 'center';
    loading.style.alignItems = 'center';

    setTimeout(() => {
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            company: document.getElementById('company').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            zip: document.getElementById('zip').value,
            country: document.getElementById('country').value,
            category: document.getElementById('category').value,
            message: document.getElementById('message').value,
        };

        fetch(
            'https://script.google.com/macros/s/AKfycbytlZhdtyKXjnxsEkdnu-FASt74MivijiUji0PoEk17hYppQZo4d0yiMwqEc6vpYlKz/exec',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                mode: 'no-cors', // Chặn lỗi CORS nhưng không nhận phản hồi
            }
        )
            .then(() => console.info('Request sent'))
            .catch((error) => console.error('Error:', error));

        document.getElementById('myForm').submit();
    }, 2000);

    setTimeout(() => {
        loading.style.display = 'none';
    }, 500);
});

// ---------------------------Handle focus & blur field---------------------------
document.querySelectorAll('input').forEach((element) => {
    element.addEventListener('focus', () => {
        if (!element.classList.contains('has-focus')) {
            element.classList.add('has-focus');
        }
    });

    element.addEventListener('blur', () => {
        const label = document.querySelector(`label[for='${element.id}']`);
        if (!label) return;
        if (!element.value) {
            element.classList.remove('has-focus');
        }
    });
});

const textArea = document.querySelector('.form-group.textarea textarea');
const labelArea = document.querySelector(
    '.form-group.textarea textarea + .visually-label'
);

if (textArea) {
    textArea.addEventListener('focus', () => {
        if (!textArea.classList.contains('has-focus')) {
            textArea.classList.add('has-focus');
            textArea.style.paddingTop = '10px';
            labelArea.style.display = 'none';
        }
    });

    textArea.addEventListener('blur', () => {
        if (!textArea.value) {
            textArea.classList.remove('has-focus');
            textArea.style.paddingTop = '26px';
            labelArea.style.display = 'block';
        }
    });
}

// ---------------------------Validation---------------------------
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const addressInput = document.getElementById('address');
const cityInput = document.getElementById('city');
const zipInput = document.getElementById('zip');
const countryInput = document.getElementById('country');
const categoryInput = document.getElementById('category');
const messageInput = document.getElementById('message');
const REGEX_PHONE_NUMBER =
    /^(0(3|5|7|8|9)[0-9]{8}|(\+84|84)(3|5|7|8|9)[0-9]{8})$/;
const REGEX_EMAIL =
    /^[a-zA-Z0-9._]{1,64}@[a-zA-Z0-9](?:[a-zA-Z0-9]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9][a-zA-Z0-9]{0,61}[a-zA-Z0-9])+$/;

const handleEmpty = (value, field, label) => {
    const input = document.getElementById(field);
    const errorElement = document.getElementById(`error-${field}`);
    if (!value) {
        errorElement.innerHTML = `${label} cannot be empty.`;
        input.style.borderColor = 'red';
    } else {
        errorElement.innerHTML = '';
        input.style.borderColor = '#00366a';
    }
};
// const handleValidateSelect = (value, field, label) => {
//     const input = document.getElementById(field);
//     const errorElement = document.getElementById(`error-${field}`);
//     if (
//         (field === 'country' && !COUNTRIES.includes(value)) ||
//         (field === 'category' && !CATEGORIES.includes(value))
//     ) {
//         errorElement.innerHTML = `${label} is invalid.`;
//         input.parentNode.style.borderColor = 'red';
//     } else {
//         errorElement.innerHTML = '';
//         input.parentNode.style.borderColor = '#00366a';
//     }
// };
const handleValidateEmail = (value, field, label) => {
    const input = document.getElementById(field);
    const errorElement = document.getElementById(`error-${field}`);
    if (REGEX_EMAIL.test(value)) {
        errorElement.innerHTML = '';
        input.style.borderColor = '#00366a';
    } else {
        errorElement.innerHTML = `${label} is invalid.`;
        input.style.borderColor = 'red';
    }
};
const handleValidatePhone = (value, field, label) => {
    const input = document.getElementById(field);
    const errorElement = document.getElementById(`error-${field}`);
    if (REGEX_PHONE_NUMBER.test(value)) {
        errorElement.innerHTML = '';
        input.style.borderColor = '#00366a';
    } else {
        errorElement.innerHTML = `${label} is invalid.`;
        input.style.borderColor = 'red';
    }
};

firstNameInput?.addEventListener('change', (event) =>
    handleEmpty(event.target.value, 'firstName', 'First Name')
);
lastNameInput?.addEventListener('change', (event) =>
    handleEmpty(event.target.value, 'lastName', 'Last Name')
);
emailInput?.addEventListener('change', (event) =>
    handleEmpty(event.target.value, 'email', 'Email')
);
emailInput?.addEventListener('change', (event) =>
    handleValidateEmail(event.target.value, 'email', 'Email')
);
phoneInput?.addEventListener('change', (event) =>
    handleEmpty(event.target.value, 'phone', 'Phone')
);
phoneInput?.addEventListener('change', (event) =>
    handleValidatePhone(event.target.value, 'phone', 'Phone')
);
addressInput?.addEventListener('change', (event) =>
    handleEmpty(event.target.value, 'address', 'Address')
);
cityInput?.addEventListener('change', (event) =>
    handleEmpty(event.target.value, 'city', 'City')
);
zipInput?.addEventListener('change', (event) =>
    handleEmpty(event.target.value, 'zip', 'ZIP/Postal Code')
);
// countryInput?.addEventListener('change', (event) =>
//     handleValidateSelect(event.target.value, 'country', 'Country or Region')
// );
// categoryInput?.addEventListener('change', (event) =>
//     handleValidateSelect(event.target.value, 'category', 'Category')
// );
messageInput?.addEventListener('change', (event) =>
    handleEmpty(event.target.value, 'message', 'Message')
);

// ---------------------------Sheet---------------------------
// const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A1:C1:append?valueInputOption=RAW&key=${API_KEY}`;

// ---------------------------Select box---------------------------
const labelCountry = document.querySelector(
    '.select-country + label.visually-label'
);
const inputCountry = document.querySelector('.input-country');
const selectCountry = document.querySelector('.select-country');
const optionsCountryWrapper = document.querySelector('.dropdown-country');

const labelCategory = document.querySelector(
    '.select-category + label.visually-label'
);
const inputCategory = document.querySelector('.input-category');
const selectCategory = document.querySelector('.select-category');
const optionsCategoryWrapper = document.querySelector('.dropdown-category');

let dataCountries = [...COUNTRIES];
let dataCategories = [...CATEGORIES];

const convertToHtmlCountries = () => {
    optionsCountryWrapper.innerHTML = dataCountries
        .map((item) => {
            return `<li>${item}</li>`;
        })
        .join('\n');
};
const convertToHtmlCategories = () => {
    optionsCategoryWrapper.innerHTML = dataCategories
        .map((item) => {
            return `<li>${item}</li>`;
        })
        .join('\n');
};

if (optionsCountryWrapper) {
    convertToHtmlCountries();
}
if (optionsCategoryWrapper) {
    convertToHtmlCategories();
}

let optionsCountry = selectCountry?.querySelectorAll('.dropdown-country li');
let optionsCategory = selectCategory?.querySelectorAll('.dropdown-category li');

const handleFocusCountryInput = () => {
    if (inputCountry) inputCountry.focus();
};
const handleFocusCategoryInput = () => {
    if (inputCategory) inputCategory.focus();
};

const handleShowDropdownCountry = (event, isShow = true) => {
    event.stopPropagation();
    event.preventDefault();
    const dropdownCountry = document.querySelector('.dropdown-country-wrapper');
    const arrowSelectbox = document.querySelector('.arrow-country');
    if (dropdownCountry && arrowSelectbox) {
        dropdownCountry.style.display = isShow ? 'block' : 'none';
        if (isShow) {
            arrowSelectbox.style.transform = 'rotate(180deg)';
            arrowSelectbox.style.top = '30%';
        } else {
            arrowSelectbox.style.transform = 'translateY(-50%)';
            arrowSelectbox.style.top = '50%';
        }
    }
};
const handleShowDropdownCategory = (isShow = true) => {
    const dropdownCategory = document.querySelector(
        '.dropdown-category-wrapper'
    );
    const arrowSelectbox = document.querySelector('.arrow-category');
    if (dropdownCategory) {
        dropdownCategory.style.display = isShow ? 'block' : 'none';
        if (isShow) {
            arrowSelectbox.style.transform = 'rotate(180deg)';
            arrowSelectbox.style.top = '30%';
        } else {
            arrowSelectbox.style.transform = 'translateY(-50%)';
            arrowSelectbox.style.top = '50%';
        }
    }
};

const handleActiveLabelCountry = () => {
    if (!selectCountry?.classList.contains('has-focus')) {
        selectCountry.classList.add('has-focus');
    }
};
const handleActiveLabelCategory = () => {
    if (!selectCategory?.classList.contains('has-focus')) {
        selectCategory.classList.add('has-focus');
    }
};

const handleInActiveLabelCountry = () => {
    if (!inputCountry.value) {
        selectCountry.classList.remove('has-focus');
    }
};
const handleInActiveLabelCategory = () => {
    if (!inputCategory.value) {
        selectCategory.classList.remove('has-focus');
    }
};

if (labelCountry) {
    const arrowSelectbox = document.querySelector('.arrow-country');
    if (arrowSelectbox && inputCountry) {
        inputCountry.addEventListener('focus', () => {
            handleShowDropdownCountry(event);
            handleActiveLabelCountry();
        });
        arrowSelectbox.addEventListener('click', handleFocusCountryInput);
    }
    labelCountry.addEventListener('click', handleFocusCountryInput);
}
if (labelCategory) {
    const arrowSelectbox = document.querySelector('.arrow-category');
    if (arrowSelectbox && inputCategory) {
        inputCategory.addEventListener('focus', () => {
            handleShowDropdownCategory();
            handleActiveLabelCategory();
        });
        arrowSelectbox.addEventListener('click', handleFocusCategoryInput);
    }
    labelCategory.addEventListener('click', handleFocusCategoryInput);
}

if (inputCountry) {
    inputCountry.addEventListener('blur', (event) => {
        setTimeout(() => {
            handleShowDropdownCountry(event, false);
            handleInActiveLabelCountry();
        }, 100);
    });

    inputCountry.addEventListener('input', (event) => {
        const searchValue = event.target.value;
        dataCountries = COUNTRIES.filter((item) =>
            item.toLowerCase().startsWith(searchValue.toLowerCase().trim())
        );
        convertToHtmlCountries();
        optionsCountry = selectCountry.querySelectorAll('.dropdown-country li');
        handleSelectOptionCountry();
    });
}
if (inputCategory) {
    inputCategory.addEventListener('blur', () => {
        setTimeout(() => {
            handleShowDropdownCategory(false);
            handleInActiveLabelCategory();
        }, 100);
    });

    inputCategory.addEventListener('input', (event) => {
        const searchValue = event.target.value;
        dataCategories = CATEGORIES.filter((item) =>
            item.toLowerCase().includes(searchValue.toLowerCase().trim())
        );
        convertToHtmlCategories();
        optionsCategory = selectCategory.querySelectorAll(
            '.dropdown-category li'
        );
        handleSelectOptionCategory();
    });
}

const removeExtraSpaces = (text) => {
    return text.replace(/\s+/g, ' ').trim();
};

const removeAllActiveCountry = () => {
    optionsCountry.forEach((option) => {
        option.classList.remove('active');
    });
};
const removeAllActiveCategory = () => {
    optionsCategory.forEach((option) => {
        option.classList.remove('active');
    });
};

const handleClickOptionCountry = (event) => {
    event.stopPropagation();
    removeAllActiveCountry();
    const newValue = removeExtraSpaces(event.target.innerHTML);
    event.target?.classList?.add('active');
    inputCountry.value = newValue;
};
const handleClickOptionCategory = (event) => {
    removeAllActiveCategory();
    const newValue = removeExtraSpaces(event.target.innerHTML);
    event.target?.classList?.add('active');
    inputCategory.value = newValue;
};

const handleSelectOptionCountry = () => {
    if (optionsCountry) {
        optionsCountry.forEach((option) => {
            option.addEventListener('click', handleClickOptionCountry);
        });
    }
};
handleSelectOptionCountry();

const handleSelectOptionCategory = () => {
    if (optionsCategory) {
        optionsCategory.forEach((option) => {
            option.addEventListener('click', handleClickOptionCategory);
        });
    }
};
handleSelectOptionCategory();
