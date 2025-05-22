$(document).ready(function () {
    const $textInput = $('#text-input');
    const $themeSelect = $('#theme-select');

    // Tema yükle
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    // Tema değiştirme
    $themeSelect.val(savedTheme);
    $themeSelect.on('change', function () {
        const selectedTheme = $(this).val();
        setTheme(selectedTheme);
        localStorage.setItem('theme', selectedTheme);
    });

    // Yazı değiştikçe analiz yap
    $textInput.on('input', function () {
        analyzeText();
    });

    // Temizle butonu
    $('#clear-btn').on('click', function () {
        $textInput.val('');
        analyzeText();
    });

    // PDF Kaydet butonu
    $('#pdf-btn').on('click', function () {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Başlık
        doc.setFontSize(16);
        doc.text('Metin Analizi Raporu', 20, 20);

        // Metin içeriği
        doc.setFontSize(12);
        const text = $textInput.val();
        const splitText = doc.splitTextToSize(text, 170);
        doc.text(splitText, 20, 30);

        // İstatistikler
        doc.setFontSize(14);
        doc.text('İstatistikler:', 20, 100);
        doc.setFontSize(12);

        const stats = [
            `Kelime Sayısı: ${$('#word-count').text()}`,
            `Harf Sayısı: ${$('#letter-count').text()}`,
            `Rakam Sayısı: ${$('#digit-count').text()}`,
            `Özel Karakter Sayısı: ${$('#special-count').text()}`,
            `Karakter Sayısı: ${$('#char-count').text()}`,
            `Satır Sayısı: ${$('#line-count').text()}`,
            `Cümle Sayısı: ${$('#sentence-count').text()}`,
            `Ortalama Kelime Uzunluğu: ${$('#avg-word-len').text()}`,
            `Ortalama Cümle Uzunluğu: ${$('#avg-sentence-len').text()}`
        ];

        doc.text(stats, 20, 110);

        // En sık kullanılan kelimeler
        doc.setFontSize(14);
        doc.text('En Sık Kullanılan Kelimeler:', 20, 160);
        doc.setFontSize(12);

        const topWords = [];
        $('#top-words li').each(function () {
            const text = $(this).text().trim();
            topWords.push(text);
        });

        doc.text(topWords, 20, 170);

        // PDF'i kaydet
        doc.save('metin-analizi.pdf');
    });

    // Verileri Kaydet butonu
    $('#save-btn').on('click', function () {
        const analysisData = {
            text: $textInput.val(),
            stats: {
                wordCount: $('#word-count').text(),
                letterCount: $('#letter-count').text(),
                digitCount: $('#digit-count').text(),
                specialCount: $('#special-count').text(),
                charCount: $('#char-count').text(),
                lineCount: $('#line-count').text(),
                sentenceCount: $('#sentence-count').text(),
                avgWordLen: $('#avg-word-len').text(),
                avgSentenceLen: $('#avg-sentence-len').text()
            },
            topWords: []
        };

        $('#top-words li').each(function () {
            const text = $(this).text().trim();
            analysisData.topWords.push(text);
        });

        // JSON dosyası olarak kaydet
        const dataStr = JSON.stringify(analysisData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = 'metin-analizi.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    });

    // İlk analiz (sayfa yüklendiğinde grafik görünsün)
    setTimeout(analyzeText, 100);

    function setTheme(theme) {
        $('body').removeClass('light dark').addClass(theme);
    }

    function analyzeText() {
        const text = $textInput.val().trim();

        // Türkçe karakterleri de içeren kelime regex'i
        const words = text.match(/\b[\wçÇğĞıİöÖşŞüÜ]+\b/g) || [];
        const characters = text.length;
        const lines = text.split(/\n/).length;
        const sentences = text.match(/[^.!?]*[.!?]+/g) || [];

        // Türkçe karakterleri de içeren harf regex'i
        const letters = text.match(/[a-zA-ZçÇğĞıİöÖşŞüÜ]/g) || [];
        const digits = text.match(/\d/g) || [];

        // İyileştirilmiş özel karakter sayımı
        const specials = text.match(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ\s\n\r\t]/g) || [];

        $('#word-count').text(words.length);
        $('#char-count').text(characters);
        $('#line-count').text(lines);
        $('#sentence-count').text(sentences.length);
        $('#letter-count').text(letters.length);
        $('#digit-count').text(digits.length);
        $('#special-count').text(specials.length);

        const avgWordLen = words.length > 0
            ? (words.reduce((sum, w) => sum + w.length, 0) / words.length).toFixed(2)
            : 0;
        const totalWords = words.length;
        const totalSentences = sentences.length;
        const avgSentenceLen = totalSentences > 0
            ? (totalWords / totalSentences).toFixed(2)
            : 0;

        $('#avg-word-len').text(avgWordLen);
        $('#avg-sentence-len').text(avgSentenceLen);

        // Sık kullanılan kelimeler
        const freq = {};
        words.forEach(word => {
            const normalized = word.toLowerCase();
            freq[normalized] = (freq[normalized] || 0) + 1;
        });

        const topWords = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word, count]) => ({ word, count }));

        $('#top-words').empty();
        topWords.forEach(item => {
            $('#top-words').append(
                `<li class="list-group-item d-flex justify-content-between">
                    <span>${item.word}</span>
                    <span>${item.count}</span>
                </li>`
            );
        });

        updateChart(topWords);
    }

    let chart;

    function updateChart(data) {
        const ctx = document.getElementById('wordChart').getContext('2d');

        if (chart) chart.destroy();

        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.word),
                datasets: [{
                    label: 'Kelime Frekansı',
                    data: data.map(d => d.count),
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        precision: 0
                    }
                }
            }
        });
    }
});