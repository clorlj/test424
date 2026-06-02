const app = document.querySelector("#app");
const pageTriggers = [...document.querySelectorAll("[data-page]")];
const navButtons = [...document.querySelectorAll(".nav-button[data-page]")];
const categoryButtons = [...document.querySelectorAll("[data-category]")];

const categories = [
    "전체",
    "아이돌/스타",
    "만화/애니/게임",
    "인형/인형소품",
    "패션/악세서리",
    "창작공예/문구",
    "포토카드/홀더",
    "기타"
];

let productCache = null;
let currentCategory = "전체";
let filterSafe = false;   // 추가: 안전결제 체크 여부
let filterOnSale = false; // 추가: 판매중 체크 여부

const store = {
    name: "비공식 굿즈 전문샵 가나안",
    address: "경기 안산시 상록구 광덕1로 375 5층 이젠컴퓨터아카데미 502호 강의실",
    lat: 37.308447129768,
    lng: 126.850952825644
};

const weatherCodes = {
    0: ["맑음", "☀"],
    1: ["대체로 맑음", "🌤"],
    2: ["구름 조금", "⛅"],
    3: ["흐림", "☁"],
    45: ["안개", "🌫"],
    48: ["서리 안개", "🌫"],
    51: ["약한 이슬비", "🌦"],
    53: ["이슬비", "🌦"],
    55: ["강한 이슬비", "🌧"],
    61: ["약한 비", "🌧"],
    63: ["비", "🌧"],
    65: ["강한 비", "🌧"],
    71: ["약한 눈", "🌨"],
    73: ["눈", "🌨"],
    75: ["강한 눈", "❄"],
    80: ["소나기", "🌦"],
    81: ["소나기", "🌦"],
    82: ["강한 소나기", "⛈"],
    95: ["뇌우", "⛈"]
};

const formatPrice = (price) => new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
}).format(price);

const formatNumber = (number) => new Intl.NumberFormat("ko-KR").format(number);

const loadProducts = async () => {
    if (productCache) return productCache;

    const response = await fetch("./data/products.json");
    if (!response.ok) throw new Error("products.json load failed");
    productCache = await response.json();
    return productCache;
};

const setActiveNav = (page) => {
    navButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.page === page);
    });
};

const navigate = (page, options = {}) => {
    setActiveNav(page);
    routes[page]?.(options);
    app.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // 추가된 부분
};

const renderHome = () => {
    app.innerHTML = `
        <section class="hero">
            <div class="hero-copy">
                <span class="eyebrow scroll-reveal">Unofficial K-POP Goods Store</span>
                <h1 class="scroll-reveal" style="transition-delay: 0.1s;">GANAAN</h1>
                <p class="scroll-reveal" style="transition-delay: 0.2s;">
                    온라인 쇼핑몰을 소유하지 않거나 오픈마켓에 입점하지 않은 개인을 위한 맞춤 주문서 서비스.<br>
                    제일 빠르게 K-POP을 포함한 다양한 장르의 굿즈를 지금 바로 가나안에서 거래해보세요.
                </p>
                <div class="hero-actions scroll-reveal" style="transition-delay: 0.3s;">
                    <button class="primary-button" type="button" data-jump="products">상품 보기</button>
                    <button class="secondary-button" type="button" data-jump="today">오늘의 팬 스케줄</button>
                </div>
            </div>
        </section>
    `;

    app.querySelectorAll("[data-jump]").forEach((button) => {
        button.addEventListener("click", () => navigate(button.dataset.jump));
    });

    // IntersectionObserver API로 화면에 보일 때 애니메이션(.is-visible) 실행
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.1 });

    app.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
};

const renderProducts = async ({ category = "전체" } = {}) => {
    currentCategory = category;
    app.innerHTML = `
        <section class="section-page product-list-page">
            <div class="section-head market-head">
                <div>
                    <span class="eyebrow">GANAAN Market</span>
                    <h1>${category === "전체" ? "전체 상품" : category}</h1>
                    <p>상품을 누르면 구매 창으로 이동합니다. 상단 상품 보기 메뉴에서는 카테고리별 목록을 바로 열 수 있습니다.</p>
                </div>
                <button class="sort-button" type="button">최신순</button>
            </div>
            <div class="market-toolbar" aria-label="상품 조건">
                <button class="round-filter ${filterSafe ? 'is-active' : ''}" type="button" data-filter="safe">안전결제</button>
                <button class="round-filter ${filterOnSale ? 'is-active' : ''}" type="button" data-filter="onsale">판매중</button>
            </div>
            <div class="category-chips" aria-label="카테고리 빠른 이동">
                ${categories.map((item) => `
                    <button class="${item === category ? "is-selected" : ""}" type="button" data-filter-category="${item}">${item}</button>
                `).join("")}
            </div>
            <div id="product-grid" class="product-grid listing-grid">
                <div class="loading">상품을 불러오는 중입니다.</div>
            </div>
        </section>
    `;

    const grid = app.querySelector("#product-grid");

    try {
        const products = await loadProducts();
        
        // 1차 필터: 카테고리 분류
        let visibleProducts = category === "전체"
            ? products
            : products.filter((product) => product.category === category);

        // 2차 필터: 안전결제 여부
        if (filterSafe) {
            visibleProducts = visibleProducts.filter((product) => product.safe === true);
        }
        
        // 3차 필터: 판매중 여부
        if (filterOnSale) {
            visibleProducts = visibleProducts.filter((product) => product.status === "판매중");
        }

        if (visibleProducts.length === 0) {
            grid.innerHTML = `<div class="empty-state">조건에 맞는 상품이 없습니다.</div>`;
        } else {
            grid.innerHTML = visibleProducts.map(renderProductCard).join("");
        }

        app.querySelectorAll("[data-product-id]").forEach((card) => {
            card.addEventListener("click", () => renderProductDetail(Number(card.dataset.productId)));
        });
    } catch (error) {
        grid.innerHTML = `<div class="empty-state">상품 데이터를 불러오지 못했습니다. 로컬 서버에서 다시 실행해 주세요.</div>`;
    }

    app.querySelectorAll("[data-filter-category]").forEach((button) => {
        button.addEventListener("click", () => navigate("products", { category: button.dataset.filterCategory }));
    });

    // 새로 추가: 안전결제, 판매중 버튼 클릭 이벤트 처리
    app.querySelectorAll("[data-filter]").forEach((button) => {
        button.addEventListener("click", () => {
            if (button.dataset.filter === "safe") filterSafe = !filterSafe;
            if (button.dataset.filter === "onsale") filterOnSale = !filterOnSale;
            
            // 버튼을 누를 때마다 화면을 새로고침하여 바뀐 필터를 적용
            renderProducts({ category: currentCategory });
        });
    });
};

const renderProductCard = (product) => `
    <button class="listing-card" type="button" data-product-id="${product.id}">
        <span class="listing-thumb">
            <img src="${product.image}" alt="${product.name}">
            ${product.safe ? `<span class="safe-label">안전</span>` : ""}
            <span class="heart-button" aria-hidden="true">♡</span>
        </span>
        <span class="listing-meta">
            <span><span class="seller-dot"></span>${product.seller}</span>
            <span>${formatNumber(product.views)} 조회</span>
        </span>
        <strong class="listing-title">${product.name}</strong>
        <span class="listing-price">${formatPrice(product.price)}</span>
        <span class="listing-tags">
            ${product.tags.map((tag) => `<span>${tag}</span>`).join("")}
        </span>
    </button>
`;

const renderProductDetail = async (productId) => {
    setActiveNav("products");

    try {
        const products = await loadProducts();
        const product = products.find((item) => item.id === productId);
        if (!product) throw new Error("product not found");

        const discount = product.originalPrice
            ? Math.round((1 - product.price / product.originalPrice) * 100)
            : 0;

        app.innerHTML = `
            <section class="section-page detail-page">
                <button class="back-button" type="button" data-back-products>← 상품 목록으로</button>
                <div class="purchase-layout">
                    <div class="purchase-gallery">
                        <div class="purchase-main-image">
                            <img src="${product.image}" alt="${product.name}">
                        </div>
                        <div class="thumb-row" aria-label="상품 이미지 썸네일">
                            <span><img src="${product.image}" alt=""></span>
                            <span><img src="${product.image2}" alt=""></span>
                            <span><img src="${product.image3}" alt=""></span>
                            <span><img src="${product.image4}" alt=""></span>
                        </div>
                    </div>
                    <aside class="purchase-panel">
                        <div class="seller-brand">
                            <span class="seller-dot"></span>
                            <strong>${product.seller}</strong>
                            <span>${product.safe ? "안전결제 가능" : "판매자 직접거래"}</span>
                        </div>
                        <div class="line"></div>
                        <h1>${product.name}</h1>
                        <div class="review-line">
                            <span class="star">★</span>
                            <button type="button">조회 ${formatNumber(product.views)}개</button>
                        </div>
                        <div class="detail-price-section">
                            ${product.originalPrice ? `
                                <div class="original-price">
                                    <span class="percent">${discount}%</span>
                                    <span class="strike">${formatPrice(product.originalPrice)}</span>
                                </div>
                            ` : ""}
                            <div class="coupon-price">
                                <strong>${formatPrice(product.price)}</strong>
                                <span>쿠폰적용가</span>
                            </div>
                        </div>
                        <div class="deal-box">
                            <strong>판매 안내</strong>
                            <span>${product.deal}</span>
                        </div>
                        <p class="detail-desc">${product.description}</p>
                        <div class="listing-tags detail-tags">
                            <span>${product.category}</span>
                            ${product.tags.map((tag) => `<span>${tag}</span>`).join("")}
                        </div>
                        <div class="product-actions detail-actions">
                            <button class="coupon-button" type="button">↓ 쿠폰받기</button>
                            <button class="buy-button" type="button">구매하기</button>
                        </div>
                    </aside>
                </div>
            </section>
        `;

        app.querySelector("[data-back-products]").addEventListener("click", () => {
            navigate("products", { category: currentCategory });
        });
    } catch (error) {
        app.innerHTML = `
            <section class="section-page">
                <div class="empty-state">상품 정보를 찾지 못했습니다.</div>
            </section>
        `;
    }
};

const renderToday = () => {
    app.innerHTML = `
        <section class="section-page">
            <div class="section-head">
                <div>
                    <span class="eyebrow">Today widget</span>
                    <h1>투데이</h1>
                    <p>현재 시간과 날씨 정보를 실시간으로 확인하고, 빠른 스케쥴 확인이 가능합니다.</p>
                </div>
            </div>
            
            <div class="today-grid">
                <article class="info-panel">
                    <h2>현재 시간</h2>
                    <p id="clock" class="clock">--:--:--</p>
                    <p id="date" class="date">날짜를 불러오는 중입니다.</p>
                </article>
                <article class="info-panel">
                    <h2>오늘의 날씨</h2>
                    <div id="weather" class="weather-value">
                        <span class="weather-icon">⛅</span>
                        <div>
                            <div class="weather-temp">--°C</div>
                            <p class="weather-desc">날씨 정보를 불러오는 중입니다.</p>
                        </div>
                    </div>
                </article>
            </div>

            <div class="notice-preview-section">
                <div class="notice-header">
                    <h2>사전녹화 및 콘서트 공지</h2>
                    <button type="button" class="more-button" data-jump="board" title="게시판 더보기">+</button>
                </div>
                <ul class="notice-list">
                    <li data-jump="board">
                        <span class="notice-badge red">사전녹화</span> 
                        <span class="notice-title">MEOVV(미야오) - 'DDI RO RI' 260604 (목) Mnet 엠카운트다운 사전녹화 참여 안내</span>
                        <span class="notice-date">2026.06.02</span>
                    </li>
                    <li data-jump="board">
                        <span class="notice-badge blue">콘서트</span> 
                        <span class="notice-title">2026 82MAJOR FAN-CONCERT 82 Office : Vacation 예매 안내</span>
                        <span class="notice-date">2026.06.01</span>
                    </li>
                    <li data-jump="board">
                        <span class="notice-badge red">사전녹화</span> 
                        <span class="notice-title">aespa “5/31 (일) SBS 인기가요 'LEMONADE' 사전녹화 참여 안내</span>
                        <span class="notice-date">2026.05.29</span>
                    </li>
                    <li data-jump="board">
                        <span class="notice-badge gray">공지</span> 
                        <span class="notice-title">MEOVV(미야오) [BITE NOW] 앨범 발매 기념 팝업스토어 운영 안내</span>
                        <span class="notice-date">2026.05.29</span>
                    </li>
                    <li data-jump="board">
                        <span class="notice-badge gray">공지</span> 
                        <span class="notice-title">가나안(GANAAN) 사이트 정기 점검 안내</span>
                        <span class="notice-date">2026.05.29</span>
                    </li>
                </ul>
            </div>
        </section>
    `;

    updateClock();
    window.clearInterval(window.ganaanClockTimer);
    window.ganaanClockTimer = window.setInterval(updateClock, 1000);
    loadWeather();

    // 게시판 이동 버튼 이벤트 바인딩
    app.querySelectorAll("[data-jump]").forEach((button) => {
        button.addEventListener("click", () => navigate(button.dataset.jump));
    });
};

const updateClock = () => {
    const clock = document.querySelector("#clock");
    const date = document.querySelector("#date");
    if (!clock || !date) return;

    const now = new Date();
    clock.textContent = new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(now);
    date.textContent = new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long"
    }).format(now);
};

const loadWeather = () => {
    const fallback = { latitude: 37.5665, longitude: 126.9780 };

    const render = ({ latitude, longitude }) => {
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`)
            .then((response) => response.json())
            .then((data) => {
                const code = data.current?.weather_code ?? 0;
                const [label, icon] = weatherCodes[code] ?? ["날씨 확인", "⛅"];
                const temp = Math.round(data.current?.temperature_2m ?? 0);
                const target = document.querySelector("#weather");
                if (!target) return;
                target.innerHTML = `
                    <span class="weather-icon">${icon}</span>
                    <div>
                        <div class="weather-temp">${temp}°C</div>
                        <p class="weather-desc">${label}</p>
                    </div>
                `;
            })
            .catch(() => {
                const desc = document.querySelector(".weather-desc");
                if (desc) desc.textContent = "날씨 API 연결을 확인해 주세요.";
            });
    };

    if (!navigator.geolocation) {
        render(fallback);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        ({ coords }) => render(coords),
        () => render(fallback),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
    );
};

const renderMap = () => {
    app.innerHTML = `
        <section class="section-page">
            <div class="section-head">
                <div>
                    <span class="eyebrow">Store Location</span>
                    <h1>오시는 길</h1>
                    <p>K-POP 비공식 굿즈샵답게 매장도 비공식적으로 운영합니다.</p>
                </div>
            </div>
            <div class="map-grid">
                <div class="map-box">
                    <div id="kakao-map">
                        <div class="fallback-map"></div>
                    </div>
                </div>
                <aside class="info-panel">
                    <h2>${store.name}</h2>
                    <p class="date">${store.address}</p>
                    <div class="store-list">
                        <div><b>운영 시간</b><span>평일 09:30 - 18:00 (주말/공휴일 휴무)</span></div>
                        <div><b>알아두셔야 할 점</b><span>가나안은 상품 유통만 하기에 오신다고 뭘 드릴 순 없습니다.<br>뭐라도 원하시면 강의실 뒤쪽의 젤리나 사탕을 가져가세요.</span></div>
                        <div><b>길찾기</b><span>한대앞역 2번 출구 도보 5분 거리입니다.</span></div>
                    </div>
                </aside>
            </div>
        </section>
    `;

    window.setTimeout(initKakaoMap, 200);
};

const initKakaoMap = () => {
    const mapNode = document.querySelector("#kakao-map");
    if (!mapNode || !window.kakao?.maps || !window.kakao.maps.LatLng) return;

    const center = new kakao.maps.LatLng(store.lat, store.lng);
    const map = new kakao.maps.Map(mapNode, {
        center,
        level: 3
    });
    const marker = new kakao.maps.Marker({ position: center });
    marker.setMap(map);

    const info = new kakao.maps.InfoWindow({
        content: `<div style="padding:10px 12px;font-size:13px;color:#111;text-align:center;line-height:1.4;">
                    <strong>${store.name}</strong><br>
                    <span style="font-size:11px;color:#666;">${store.address}</span>
                  </div>`
    });
    info.open(map, marker);
};

// 새로 추가된 게시판 화면 (껍데기 구조)
const renderBoard = () => {
    app.innerHTML = `
        <section class="section-page">
            <div class="section-head">
                <div>
                    <span class="eyebrow">Notice Board</span>
                    <h1>공지사항 게시판</h1>
                    <p>사전녹화 및 콘서트 전체 공지사항을 확인하세요.</p>
                </div>
            </div>
            <div class="empty-state" style="margin-top: 40px;">
                권한이 없습니다. 로그인 후 이용해주세요.
            </div>
        </section>
    `;
};

const routes = {
    home: renderHome,
    products: renderProducts,
    today: renderToday,
    map: renderMap,
    board: renderBoard // 라우트 추가
};

pageTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
        event.preventDefault();
        navigate(trigger.dataset.page);
    });
});

categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
        navigate("products", { category: button.dataset.category });
    });
});

navigate("home");

window.addEventListener('scroll', () => {
    const header = document.querySelector('.site-header');
    if (window.scrollY > 50) {
        header.classList.add('is-scrolled');
    } else {
        header.classList.remove('is-scrolled');
    }
});