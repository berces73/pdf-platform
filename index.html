/**
 * PDF Platform - Core Script
 * Tarayıcı tabanlı PDF işlemleri için merkezi kontrol
 */

// ====================================================================
// CONSTANTS - Sihirli sayılar yerine sabitler
// ====================================================================

const CONFIG = {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
    MAX_FILES_COUNT: 20,
    ALLOWED_EXTENSIONS: ['pdf', 'jpg', 'jpeg', 'png'],
    ANIMATION_DURATION: 300,
    SUCCESS_MESSAGE_DURATION: 3000
};

const MESSAGES = {
    noFile: 'Lütfen bir dosya seçin',
    invalidFormat: 'Desteklenmeyen dosya formatı',
    fileTooLarge: 'Dosya çok büyük (maksimum 50 MB)',
    tooManyFiles: 'En fazla 20 dosya seçebilirsiniz',
    processing: 'İşleniyor...',
    success: 'Tamamlandı! Dosyanız indiriliyor',
    error: 'Bir sorun oluştu. Lütfen tekrar deneyin',
    selectFiles: 'Dosyaları sürükleyin veya tıklayın'
};

// ====================================================================
// CORE UTILITIES - Temel yardımcı fonksiyonlar
// ====================================================================

const FileUtils = {
    /**
     * Dosya adı oluşturur: dosya_merge_2026-02-11.pdf
     */
    generateFilename(originalName, operation) {
        const baseName = this.removeExtension(originalName);
        const timestamp = this.getTimestamp();
        const extension = this.getExtension(originalName);
        
        return `${baseName}_${operation}_${timestamp}.${extension}`;
    },

    /**
     * Dosya uzantısını al
     */
    getExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    },

    /**
     * Dosya adından uzantıyı kaldır
     */
    removeExtension(filename) {
        return filename.replace(/\.[^/.]+$/, '');
    },

    /**
     * Timestamp üret: 2026-02-11
     */
    getTimestamp() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    },

    /**
     * Dosya uzantısını doğrula
     */
    isValidExtension(filename) {
        const ext = this.getExtension(filename);
        return CONFIG.ALLOWED_EXTENSIONS.includes(ext);
    },

    /**
     * Dosya boyutunu kontrol et
     */
    isValidSize(file) {
        return file.size <= CONFIG.MAX_FILE_SIZE;
    },

    /**
     * İnsan okunabilir dosya boyutu: 2.5 MB
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
};

// ====================================================================
// UI CONTROLLER - Kullanıcı arayüzü yönetimi
// ====================================================================

const UI = {
    /**
     * Başarı mesajı göster
     */
    showSuccess(message = MESSAGES.success) {
        this.showMessage(message, 'success');
    },

    /**
     * Hata mesajı göster
     */
    showError(message = MESSAGES.error) {
        this.showMessage(message, 'error');
    },

    /**
     * Bilgi mesajı göster
     */
    showInfo(message) {
        this.showMessage(message, 'info');
    },

    /**
     * Genel mesaj gösterici
     */
    showMessage(text, type) {
        // Mevcut mesajları temizle
        this.clearMessages();

        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = text;
        messageEl.setAttribute('role', 'alert');

        // Sayfada #message-container varsa oraya ekle
        const container = document.getElementById('message-container') || document.body;
        container.appendChild(messageEl);

        // Animasyon
        setTimeout(() => messageEl.classList.add('show'), 10);

        // Başarı mesajları otomatik kaybolsun
        if (type === 'success') {
            setTimeout(() => this.removeMessage(messageEl), CONFIG.SUCCESS_MESSAGE_DURATION);
        }
    },

    /**
     * Mesajı kaldır
     */
    removeMessage(messageEl) {
        messageEl.classList.remove('show');
        setTimeout(() => messageEl.remove(), CONFIG.ANIMATION_DURATION);
    },

    /**
     * Tüm mesajları temizle
     */
    clearMessages() {
        document.querySelectorAll('.message').forEach(msg => msg.remove());
    },

    /**
     * Loading durumu göster/gizle
     */
    setLoading(isLoading, buttonEl) {
        if (!buttonEl) return;

        if (isLoading) {
            buttonEl.disabled = true;
            buttonEl.dataset.originalText = buttonEl.textContent;
            buttonEl.textContent = MESSAGES.processing;
            buttonEl.classList.add('loading');
        } else {
            buttonEl.disabled = false;
            buttonEl.textContent = buttonEl.dataset.originalText || buttonEl.textContent;
            buttonEl.classList.remove('loading');
        }
    },

    /**
     * Dosya listesi önizlemesi
     */
    renderFileList(files, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        Array.from(files).forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-name">${file.name}</span>
                <span class="file-size">${FileUtils.formatFileSize(file.size)}</span>
                <button class="remove-file" data-index="${index}">×</button>
            `;
            container.appendChild(fileItem);
        });
    }
};

// ====================================================================
// VALIDATOR - Dosya doğrulama
// ====================================================================

const Validator = {
    /**
     * Dosya seçimi yapıldı mı?
     */
    hasFiles(files) {
        if (!files || files.length === 0) {
            UI.showError(MESSAGES.noFile);
            return false;
        }
        return true;
    },

    /**
     * Dosya sayısı sınırında mı?
     */
    checkFileCount(files) {
        if (files.length > CONFIG.MAX_FILES_COUNT) {
            UI.showError(MESSAGES.tooManyFiles);
            return false;
        }
        return true;
    },

    /**
     * Tüm dosyaları doğrula
     */
    validateFiles(files) {
        if (!this.hasFiles(files)) return false;
        if (!this.checkFileCount(files)) return false;

        for (let file of files) {
            if (!FileUtils.isValidExtension(file.name)) {
                UI.showError(`${MESSAGES.invalidFormat}: ${file.name}`);
                return false;
            }

            if (!FileUtils.isValidSize(file)) {
                UI.showError(`${MESSAGES.fileTooLarge}: ${file.name}`);
                return false;
            }
        }

        return true;
    },

    /**
     * Tek dosya doğrula
     */
    validateSingleFile(file) {
        return this.validateFiles([file]);
    }
};

// ====================================================================
// DOWNLOAD MANAGER - Dosya indirme yönetimi
// ====================================================================

const DownloadManager = {
    /**
     * Blob'u indir
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        // Cleanup
        setTimeout(() => URL.revokeObjectURL(url), 100);
    },

    /**
     * Base64'ü indir
     */
    downloadBase64(base64Data, filename, mimeType = 'application/pdf') {
        const byteString = atob(base64Data.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);

        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([ab], { type: mimeType });
        this.downloadBlob(blob, filename);
    }
};

// ====================================================================
// PDF PROCESSOR - PDF işlemleri için temel sınıf
// ====================================================================

class PDFProcessor {
    constructor(operation) {
        this.operation = operation;
    }

    /**
     * İşlem başlat
     */
    async process(files, options = {}) {
        try {
            // Doğrulama
            if (!Validator.validateFiles(files)) {
                return;
            }

            // UI feedback
            UI.clearMessages();
            const button = options.button;
            if (button) UI.setLoading(true, button);

            // İşlem yap
            const result = await this.execute(files, options);

            // Başarılı
            if (result) {
                UI.showSuccess();
                
                // İndirme
                if (result.blob && result.filename) {
                    DownloadManager.downloadBlob(result.blob, result.filename);
                }
            }

        } catch (error) {
            console.error('PDF işlem hatası:', error);
            UI.showError(error.message || MESSAGES.error);
        } finally {
            if (options.button) {
                UI.setLoading(false, options.button);
            }
        }
    }

    /**
     * Gerçek işlem - alt sınıflar override edecek
     */
    async execute(files, options) {
        throw new Error('execute() metodu override edilmeli');
    }

    /**
     * Yardımcı: İlk dosyanın adını al
     */
    getBaseFilename(files) {
        return files[0]?.name || 'document.pdf';
    }

    /**
     * Yardımcı: Çıktı dosya adı üret
     */
    generateOutputFilename(inputFilename) {
        return FileUtils.generateFilename(inputFilename, this.operation);
    }
}

// ====================================================================
// TOOL IMPLEMENTATIONS - PDF araçları
// ====================================================================

/**
 * PDF Birleştirme
 */
class MergeTool extends PDFProcessor {
    constructor() {
        super('merged');
    }

    async execute(files, options) {
        // pdf-lib kütüphanesi yüklü olmalı
        if (typeof PDFLib === 'undefined') {
            throw new Error('PDF kütüphanesi yüklenmedi');
        }

        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (let file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const filename = this.generateOutputFilename(this.getBaseFilename(files));

        return { blob, filename };
    }
}

/**
 * PDF Sıkıştırma (metadata temizleme)
 */
class CompressTool extends PDFProcessor {
    constructor() {
        super('compressed');
    }

    async execute(files, options) {
        if (typeof PDFLib === 'undefined') {
            throw new Error('PDF kütüphanesi yüklenmedi');
        }

        const { PDFDocument } = PDFLib;
        const file = files[0];

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);

        // Metadata temizle
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setCreator('PDF Platform');
        pdfDoc.setProducer('PDF Platform');

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const filename = this.generateOutputFilename(file.name);

        return { blob, filename };
    }
}

/**
 * JPG'den PDF'e dönüştürme
 */
class JpgToPdfTool extends PDFProcessor {
    constructor() {
        super('converted');
    }

    async execute(files, options) {
        if (typeof PDFLib === 'undefined') {
            throw new Error('PDF kütüphanesi yüklenmedi');
        }

        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.create();

        for (let file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const image = await (file.type === 'image/png' 
                ? pdfDoc.embedPng(arrayBuffer) 
                : pdfDoc.embedJpg(arrayBuffer));

            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        const baseName = FileUtils.removeExtension(this.getBaseFilename(files));
        const filename = `${baseName}_${this.operation}_${FileUtils.getTimestamp()}.pdf`;

        return { blob, filename };
    }
}

// ====================================================================
// TOOL FACTORY - Araç fabrikası
// ====================================================================

const ToolFactory = {
    tools: {
        'merge': MergeTool,
        'compress': CompressTool,
        'jpg-to-pdf': JpgToPdfTool
        // Yeni araçlar buraya eklenebilir
    },

    /**
     * Araç oluştur
     */
    create(toolType) {
        const ToolClass = this.tools[toolType];
        
        if (!ToolClass) {
            throw new Error(`Bilinmeyen araç türü: ${toolType}`);
        }

        return new ToolClass();
    },

    /**
     * Yeni araç kaydet
     */
    register(toolType, ToolClass) {
        this.tools[toolType] = ToolClass;
    }
};

// ====================================================================
// MAIN APP CONTROLLER
// ====================================================================

const PDFApp = {
    currentTool: null,

    /**
     * Uygulamayı başlat
     */
    init() {
        this.setupEventListeners();
        this.detectCurrentTool();
    },

    /**
     * URL'den araç türünü tespit et
     */
    detectCurrentTool() {
        const urlParams = new URLSearchParams(window.location.search);
        const tool = urlParams.get('tool');
        
        if (tool) {
            this.setTool(tool);
        }
    },

    /**
     * Aktif aracı ayarla
     */
    setTool(toolType) {
        try {
            this.currentTool = ToolFactory.create(toolType);
        } catch (error) {
            console.error('Araç yükleme hatası:', error);
            this.currentTool = null;
        }
    },

    /**
     * Event listener'ları kur
     */
    setupEventListeners() {
        // Dosya yükleme alanları
        document.querySelectorAll('input[type="file"]').forEach(input => {
            input.addEventListener('change', (e) => this.handleFileSelect(e));
        });

        // İşlem butonları
        document.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => this.handleAction(e));
        });

        // Drag & Drop
        this.setupDragAndDrop();
    },

    /**
     * Dosya seçimi
     */
    handleFileSelect(event) {
        const files = event.target.files;
        
        if (Validator.validateFiles(files)) {
            UI.renderFileList(files, 'file-list');
        }
    },

    /**
     * Aksiyon butonları
     */
    handleAction(event) {
        const button = event.target;
        const action = button.dataset.action;
        const fileInputId = button.dataset.fileInput || 'file-input';
        const fileInput = document.getElementById(fileInputId);

        if (!fileInput) {
            console.error('Dosya input elementi bulunamadı');
            return;
        }

        const files = fileInput.files;

        if (this.currentTool) {
            this.currentTool.process(files, { button });
        } else {
            UI.showError('Araç yüklenemedi');
        }
    },

    /**
     * Drag & Drop kurulumu
     */
    setupDragAndDrop() {
        const dropZones = document.querySelectorAll('.drop-zone');

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');

                const files = e.dataTransfer.files;
                const fileInputId = zone.dataset.fileInput || 'file-input';
                const fileInput = document.getElementById(fileInputId);

                if (fileInput) {
                    fileInput.files = files;
                    fileInput.dispatchEvent(new Event('change'));
                }
            });
        });
    }
};

// ====================================================================
// AUTO-INIT
// ====================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PDFApp.init());
} else {
    PDFApp.init();
}

// ====================================================================
// GLOBAL EXPORT (gerekirse manuel kullanım için)
// ====================================================================

window.PDFPlatform = {
    FileUtils,
    UI,
    Validator,
    ToolFactory,
    PDFApp
};