# Dilara Altınkepçe Arslan — Web sitesi R02

Bu paket mevcut adresleri koruyan, doğrudan GitHub Pages üzerinde çalışabilecek bir statik portfolyo ve ALARM için beş gözlem ekranı içerir. Paket henüz canlı siteye yayımlanmadı. Mevcut sitenin GitHub deposu, dosyalardaki bağlantıya göre `gh-kerimarslan/N-DilaraAltinkepceArslan`.


## R02 — Google Cloud olmadan saatlik kontrol

Bu sürümde önerilen ilk yayın yolu GitHub Pages ve GitHub Actions'tır. Google Cloud zorunlu değildir. Ana site yalnızca içerik değiştiğinde yayımlanır. Saatlik görev fotoğraf ve fontları tekrar yüklemez; yalnızca birkaç KB boyutundaki sinyal JSON dosyasını `alarm-data` dalına yazar. Tabletler bu dosyayı okur. Verinin kaynak gözlem saati ve görev sonucunun üretim saati ayrı değerlendirilir. Görev sonucu 2,5 saatten eskiyse ekran `stale` durumuna geçer.

Bu çalışma sırasında GitHub bağlantısı henüz kurulmadığı için canlı deponun görünürlüğü, Pages ayarları ve yayın durumu doğrulanmadı. Görev dosyaları hazırlanıp yerel kontrolleri yapıldı; GitHub üzerinde çalıştırılmadı.

### Etkinleştirme

1. Depodaki Pages yayın kaynağını **GitHub Actions** yapın ve `Publish artist website` görevini çalıştırın. `publish-site.yml` yalnızca `main` dalını otomatik yayımlar. Farklı bir yayın dalı varsa önce ona göre düzenleyin.
2. Saatlik yolun public raw JSON erişimi için depo herkese açık olmalıdır. Kod depo görünürlüğünü değiştirmez. Depo özelse bu görev devreye girmez; özel bir depoda kalınacaksa ayrı bir public sinyal deposu veya Cloud Run alternatifi seçilmelidir.
3. Kaynaklar ve sanatsal eşikler belirlendiğinde `backend/channels.example.json` biçimindeki yapılandırmayı `ALARM_CHANNELS_JSON` adlı **repository secret** olarak kaydedin. Kaynak erişim anahtarı varsa JavaScript'e veya depoya yazmayın.
4. İzin verilen veri sağlayıcıların tam alan adlarını `ALARM_FEED_HOSTS` adlı repository variable'a virgülle ayırarak koyun.
5. `ALARM_HOURLY_ENABLED` adlı repository variable'ı `true` yapın. Ardından önce `Hourly ALARM observations`, sonra `Publish artist website` görevini elle bir kez çalıştırın. İkinci görev beş sayfanın veri adresini ve CSP izinlerini doğrulanmış GitHub depo adına göre yayın paketinde ayarlar.
6. Saatlik görev her saatin 17. dakikasında çalışmak üzere ayarlıdır. GitHub yoğunluğunda gecikme olabilir; bu bir kesin zaman garantisi değildir. Public depoda 60 gün etkinlik olmazsa GitHub zamanlanmış görevleri kapatabilir. İşin uzun süreli sergi kullanımı için Actions durumu ve veri tazeliği takip edilmelidir.
7. Public depolardaki standart GitHub-hosted runner çalışmaları ücretsizdir. Özel depolarda hesap kotası ve plan kontrol edilmelidir. Gemini veya başka bir model API'si eklenirse onun kotası ve kullanım koşulları ayrıca geçerlidir. Hiçbir ücretli hizmet bu paket tarafından etkinleştirilmez.

Sayısal veri/eşik karşılaştırması LLM gerektirmez. Haber metni sınıflandırma gerekiyorsa model saatlik görevde çalışabilir veya bir API kullanılabilir. Modelin browser içine indirilmesi saatlik zamanlamayı sağlamaz ve tabletlerin kaynak tüketimini artırır. Bu sürümde LLM veya dış model API'si etkinleştirilmedi. Henüz seçilmemiş kaynaklar `unknown` kalır.

## Bu sürümde çalışanlar

- Yeni ana sayfa, ortak menü, mobil gezinme ve doğrudan HTML içinde yer alan altbilgi.
- Tamamlanan About sayfası, sergi ve eser arşivi, klavye ve dokunma destekli fotoğraf büyütme.
- Ana sitede yerel Nimbus Sans. ENV.NO.26.004.511 bölümünde kullanıcı tarafından sağlanmış Futura Book TR ve Bold TR.
- Yerel fontlar, sıkıştırılmış fotoğraflar, mobil WebP önizlemeler. Mevcut JPEG bağlantıları korunur. Kaynak ZIP orijinalleri baskı arşivi olarak saklanmalıdır, web görselleri baskı dosyası değildir.
- Her sayfaya özgü canonical adresi, paylaşım bilgileri, sitemap ve 404 sayfası.
- Varsayılan kapalı Analytics. Kullanıcı tercihi verilmedikçe Google etiketi yüklenmez. DNT/GPC sinyallerine uyulur. Tercihler footer içinden değiştirilebilir.
- ALARM giriş sayfası ve Molok, Çita, Hamam Böceği, Kuzgun, Goril ekranları. Türkçe / İngilizce seçimi, tarama ve çevresel hareketler, açık etiketli simülasyon durumları.
- Tam ekran ve ekranı açık tutma isteği için düğme. Bu özellikler gerçek Android cihaz üzerinde doğrulanmalıdır. Önizleme tarayıcısı tam ekran isteğini reddetti, hata durumu ekranda açıkça gösterildi.

## Henüz tamamlanmamış bağlantılar

- Google Cloud hesabında servis kurulmadı; gerçek veri kaynakları ve alarm eşikleri etkinleştirilmedi.
- Eski yazılımcının sistemi veya barındırıldığı hesap tespit edilmedi. Bu paket bağımsız bir yeni yapı içerir.
- Hayvanların mevcut JPG görselleri korunur. Bu sürümde hareket eden tarama ve çevre katmanları vardır; anatomik animasyon yoktur. Önceki 3D model ve 15 hareket bu pakete dahil edilmedi ve modele komut gönderen bağlantı henüz yapılmadı.
- Kesintisiz tarihçe / arşiv kaydı yoktur. İlk veri servisi ekran istekleriyle tetiklenir ve 5 dakika önbellek kullanır. Kalıcı geçmiş gerekirse ortak veri deposu ve zamanlanmış görev eklenmelidir.

## GitHub Pages'e yükleme

1. Mevcut depoyu yedekleyin veya yeni bir dal oluşturun.
2. Bu paketin içindeki dosyaları depo köküne yerleştirin. `CNAME` dosyası mevcut alan adını korur. ZIP dosyasını olduğu gibi yüklemek siteyi güncellemez.
3. GitHub **Settings → Pages** altında mevcut yayın dalını ve kök klasörü seçin. Bu sürüm için Node, npm veya sürekli çalışan bir sunucu gerekmez.
4. HTTPS zorlamasını açık tutun ve alan adı doğrulamasını tamamlayın. DNS ayarlarını bu paket değiştirmez.
5. Sayfa adresleri korunur. `/alarm/index.html` yeni eser alanıdır.

Bu dosyalar statik olarak doğrudan yayımlanabilir. Ortak header veya footer üzerinde sonradan değişiklik yapılırsa `python3 scripts/sync_layout.py` komutu ilgili bölümleri sayfalara yeniden yerleştirir. İçerik düzenledikten sonra `python3 scripts/check_site.py` ile bağlantıları kontrol edin.

## ALARM ekranları

| Kanal | Adres | Beden parçası | Kavramsal başlık |
|---|---|---|---|
| Molok | `alarm/moloch.html` | Kuyruk | Kuraklık |
| Çita | `alarm/cheetah.html` | Gövde | Hızlı tüketim |
| Hamam böceği | `alarm/cockroach.html` | Kanatlar | Radyasyon |
| Kuzgun | `alarm/raven.html` | Baş | Bilgi / yanlış bilgi |
| Goril | `alarm/gorilla.html` | Gözler | İnsani değerlerin erozyonu |

Her tablette bir kanal açılır. **Sergilemeyi başlat** seçeneği kullanıcı dokunuşuyla tam ekranı ister. Sayfa açık ve görünürken desteklenen cihazda ekranı açık tutma isteği kullanılır. Pil tasarrufu veya tarayıcı kısıtları bunu engelleyebilir; sergi öncesinde gerçek cihazlarda uzun süreli deneme yapılmalıdır. Tarayıcının geri düğmesi veya Escape ile tam ekrandan çıkılabilir.

**Sinyali dene** canlı veriden ayrı bir simülasyondur. Simülasyon etiketi ekranda kalır. Başvuru sunumunda gerçek veri bağlantısı gibi anlatılmamalıdır. 2060, eserin kurgusal zamanıdır; ölçüm zamanı alanı gerçek kaynak tarihini gösterir.

## Alternatif: Google Cloud veri servisi

`backend/` klasörü salt okunur bir WSGI servisi içerir. Üretim çalıştırıcısı, 17 Kasım 2026'da PyPI üzerinden doğrulanan Gunicorn 27.0.1 sürümüne sabitlenmiştir. Kaynak değerlendirme kodu Python standart kütüphanesini kullanır. Servis bu ortamda Google Cloud'a kurulmadı ve konteyner imajı çalıştırılmadı.

Servis `/health` ve `/v1/status` adreslerini sunar. Dışarıdan veri, eşik veya kaynak URL'si değiştirme uç noktası yoktur. Kaynaklar sadece sahip tarafından yapılandırılır.

1. `channels.example.json` içindeki beş kaynak varsayılan olarak kapalıdır. Doğrulanmış kaynak adaptörleri ve sanatsal eşikler belirlenmeden açmayın.
2. Her kaynak için bir JSON URL'si, sayısal ölçüm yolu, saat dilimli ISO 8601 gözlem zamanı yolu, birim, tazelik süresi, yön ve iki eşik gerekir. Örnek dosyadaki boş alanlar bilinçlidir; uydurma ölçüm veya eşik içermez.
3. Mevcut kaynakların çoğu aynı JSON biçiminde değildir. NASA, Safecast, GDELT ve FAO için seçilen veri kümesine uygun dönüşüm/filtreleme gerekebilir. Bu servis **doğrulanmış sayısal bir JSON girdisinin karşılaştırıcısıdır**, ham haberleri veya kavramları kendiliğinden yorumlayan bir yapay zeka değildir.
4. Özel yapılandırmayı depoya koymayın. Google Secret Manager üzerinden dosya olarak bağlayın ve `ALARM_CONFIG_PATH` ile yolunu verin. `ALARM_FEED_HOSTS` yalnızca izin verilen kaynakların tam alan adlarını içermelidir. Gizli anahtarlar, varsa, Secret Manager'da kalmalıdır.
5. Cloud Run servisini kendi Google Cloud projenizde konteyner olarak yayımlayın. Başlangıç için azami 1 instance, asgari 0 instance, 1 CPU, 256 MiB, concurrency 4 ve 30 saniye istek süresi kullanın. Bütçe uyarıları, kaynak kota sınırları ve herkese açık okuma servisinin hız sınırı dağıtımda yapılandırılmalıdır. Bütçe uyarıları harcamayı otomatik durdurmaz.
6. `ALARM_ALLOWED_ORIGINS` yalnızca sitenin gerçek HTTPS kökenlerini içermelidir. CORS bir kimlik doğrulama mekanizması değildir; bu uç nokta yalnızca yayımlanabilir sanat verisi döndürmelidir.
7. Public `/v1/status` URL'si alındıktan sonra `python3 scripts/configure_alarm.py https://SERVIS.run.app/v1/status` komutu beş sayfanın veri adresini ve CSP izinlerini aynı anda günceller. Gerçek dönen adresi kullanın.

Alarm kuralları `normal`, `watch`, `alarm` durumlarını üretir. Eksik veya geçersiz veri `unknown`, eski veri `stale` olur. Her tablet aynı merkezi sonucu okur. Sunucuda 5 dakikalık önbellek vardır; tabletler görünürken 30 saniyede bir durumu sorar. Her kaynağın veri üretim sıklığı ayrı değerlendirilmelidir.

**Kaynak seçimine ilişkin somut düzeltme:** Önceki belgelerdeki Open-Meteo Satellite Radiation API, güneş ışınımı verisidir. İyonlaştırıcı radyasyon kanalı için eşdeğer sayılmaz. Safecast içinden veri türü, birim, konum ve güncellik ayrıca seçilmelidir. Haber sayısı da cehaletin veya insaniyetin doğrudan ölçümü değildir. Bu eşleştirmeler eserin sanatsal yönteminin açık bir parçası olarak belgelenmelidir.

## Güvenlik kapsamı

Uygulamada çalıştırılabilir inline JavaScript, `javascript:` bağlantıları ve gereksiz üçüncü taraf font istekleri kaldırıldı. CSP, referrer politikası, güvenli yeni sekme bağlantıları ve harici veri için metin tabanlı güvenli render kullanılır. Veri servisinde kaynak alan adı izin listesi, özel IP engeli, yönlendirme engeli, boyut/süre sınırı, ölçüm doğrulama ve gizli URL'leri göstermeyen hata davranışı vardır. Dosyalarda kimlik doğrulama anahtarı bulunduğu varsayılmadı ve hiçbir kullanıcı anahtarı eklenmedi.

Bu, tüm hesabın veya barındırmanın güvenlik denetimi değildir. GitHub hesabı, alan adı hesabı ve Google Cloud IAM ayarlarına erişilmedi. İki aşamalı doğrulama, en az yetki, dal koruması, gizli anahtar taraması ve düzenli güncellemeler sahip hesaplarında uygulanmalıdır.

GitHub Pages özel HTTP güvenlik başlıklarını bu dosyalardan uygulamaz. Meta CSP ile `frame-ancestors`, HSTS veya `X-Content-Type-Options` sağlandığı iddia edilmez. Bunlar gerekiyorsa destekleyen bir CDN/barındırıcıda HTTP yanıt başlıkları ayarlanmalıdır. `SECURITY.md` ayrıntıları içerir.

## Font ve eser hakları

Nimbus Sans lisans metni `assets/fonts/NIMBUS-LICENSE.txt` içindedir. Futura dosyaları kullanıcının daha önce sağladığı dosyalardan dönüştürüldü. Web gömme lisansı bu dosyaların içinde bulunmadığından kamuya açık yayından önce doğrulanmalıdır. Bu pakette lisanslı bir font satın alma veya lisans devri yapılmadı.

Eser görselleri ve metinleri açık kaynak yazılım lisansının kapsamına girmez. Yeni ALARM yazılımı için MIT kapsamı `LICENSE.md` içinde açıkça sınırlandırılmıştır.

## Kontroller

`python3 scripts/check_site.py`

`python3 -m unittest discover -s backend -v`

`python3 -m unittest discover -s scripts -p 'test_*.py' -v`

`node --check assets/site.js` ve `node --check assets/alarm.js`

Tarayıcıda ana sayfa, ENV, fotoğraf görüntüleyici, ALARM kanal geçişleri ve simülasyon incelendi. Gerçek Android cihaz, canlı veri sağlayıcıları, Google Cloud dağıtımı ve üretim alan adı üzerinde uçtan uca test henüz yapılmadı.
