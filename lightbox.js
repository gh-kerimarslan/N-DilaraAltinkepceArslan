document.addEventListener("DOMContentLoaded", function () {
    // Lightbox HTML Elemanlarını Dinamik Oluştur
    const lightboxOverlay = document.createElement("div");
    lightboxOverlay.id = "custom-lightbox";
    lightboxOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.92);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        cursor: zoom-out;
        transition: opacity 0.4s ease;
        opacity: 0;
    `;

    const lightboxImg = document.createElement("img");
    lightboxImg.style.cssText = `
        max-width: 90%;
        max-height: 90vh;
        object-fit: contain;
        box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        transform: scale(0.95);
        transition: transform 0.3s ease;
    `;

    lightboxOverlay.appendChild(lightboxImg);
    document.body.appendChild(lightboxOverlay);

    // Tıklanabilir Görselleri Seç (Galeri ve Kapak Görselleri)
    const images = document.querySelectorAll(".artwork-gallery img, .budun-gallery img, .highlight-image img, .fair-card-img img, .collection-collage img");

    images.forEach(img => {
        img.style.cursor = "zoom-in";
        img.addEventListener("click", function (e) {
            e.stopPropagation();
            lightboxImg.src = this.src;
            lightboxImg.alt = this.alt || "Artwork Detail";
            lightboxOverlay.style.display = "flex";
            setTimeout(() => {
                lightboxOverlay.style.opacity = "1";
                lightboxImg.style.transform = "scale(1)";
            }, 10);
        });
    });

    // Kapatma İşlevi
    lightboxOverlay.addEventListener("click", function () {
        lightboxOverlay.style.opacity = "0";
        lightboxImg.style.transform = "scale(0.95)";
        setTimeout(() => {
            lightboxOverlay.style.display = "none";
        }, 300);
    });
});
