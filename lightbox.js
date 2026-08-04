document.addEventListener('DOMContentLoaded', () => {
    // Lightbox HTML yapısını oluştur ve body'e ekle
    const lbContainer = document.createElement('div');
    lbContainer.id = 'daa-lightbox';
    lbContainer.innerHTML = `
        <div class="lb-overlay"></div>
        <div class="lb-content">
            <button class="lb-close">&times;</button>
            <button class="lb-prev">&#10094;</button>
            <img class="lb-img" src="" alt="">
            <button class="lb-next">&#10095;</button>
        </div>
    `;
    document.body.appendChild(lbContainer);

    // CSS Stillerini Ekle
    const style = document.createElement('style');
    style.innerHTML = `
        #daa-lightbox { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999999; }
        #daa-lightbox.active { display: flex; justify-content: center; align-items: center; }
        .lb-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(10, 10, 10, 0.95); cursor: zoom-out; }
        .lb-content { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; max-width: 90%; max-height: 90%; }
        .lb-img { max-height: 85vh; max-width: 85vw; object-fit: contain; box-shadow: 0 10px 40px rgba(0,0,0,0.5); user-select: none; border: 1px solid #333; }
        .lb-close { position: fixed; top: 25px; right: 35px; font-size: 45px; color: #fff; background: none; border: none; cursor: pointer; transition: color 0.3s; line-height: 1; }
        .lb-close:hover { color: #888; }
        .lb-prev, .lb-next { position: fixed; top: 50%; transform: translateY(-50%); font-size: 50px; color: #fff; background: none; border: none; cursor: pointer; padding: 20px; transition: 0.3s; opacity: 0.5; }
        .lb-prev:hover, .lb-next:hover { opacity: 1; }
        .lb-prev { left: 20px; }
        .lb-next { right: 20px; }
        @media(max-width:900px) {
            .lb-prev { left: 5px; font-size: 35px; }
            .lb-next { right: 5px; font-size: 35px; }
            .lb-close { top: 15px; right: 20px; font-size: 35px; }
            .lb-img { max-width: 95vw; }
        }
    `;
    document.head.appendChild(style);

    const imgElement = lbContainer.querySelector('.lb-img');
    const overlay = lbContainer.querySelector('.lb-overlay');
    const closeBtn = lbContainer.querySelector('.lb-close');
    const prevBtn = lbContainer.querySelector('.lb-prev');
    const nextBtn = lbContainer.querySelector('.lb-next');

    let currentGroup = [];
    let currentIndex = 0;

    // Sayfadaki data-lightbox olan tüm linkleri dinle
    const updateLinks = () => {
        const links = document.querySelectorAll('a[data-lightbox]');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const groupName = link.getAttribute('data-lightbox');
                currentGroup = Array.from(document.querySelectorAll(`a[data-lightbox="${groupName}"]`));
                currentIndex = currentGroup.indexOf(link);
                
                updateImage();
                lbContainer.classList.add('active');
                document.body.style.overflow = 'hidden'; 
            });
        });
    };

    function updateImage() {
        if (currentGroup.length > 0) {
            const currentLink = currentGroup[currentIndex];
            imgElement.src = currentLink.getAttribute('href');
            
            // Eğer grupta tek fotoğraf varsa sağ/sol okları gizle
            if (currentGroup.length === 1) {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
            } else {
                prevBtn.style.display = 'block';
                nextBtn.style.display = 'block';
            }
        }
    }

    function showNext() {
        if (currentGroup.length > 1) {
            currentIndex = (currentIndex + 1) % currentGroup.length;
            updateImage();
        }
    }

    function showPrev() {
        if (currentGroup.length > 1) {
            currentIndex = (currentIndex - 1 + currentGroup.length) % currentGroup.length;
            updateImage();
        }
    }

    function closeLightbox() {
        lbContainer.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    nextBtn.addEventListener('click', showNext);
    prevBtn.addEventListener('click', showPrev);
    closeBtn.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', closeLightbox);

    // Klavye Yön Tuşları
    document.addEventListener('keydown', (e) => {
        if (!lbContainer.classList.contains('active')) return;
        if (e.key === 'ArrowRight') showNext();
        if (e.key === 'ArrowLeft') showPrev();
        if (e.key === 'Escape') closeLightbox();
    });

    updateLinks();
});
