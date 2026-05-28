class VoiceInputApp {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.finalTranscript = '';
        this.history = [];
        
        this.initElements();
        this.initRecognition();
        this.loadHistory();
        this.bindEvents();
        this.updateCharCount();
    }

    initElements() {
        this.voiceBtn = document.getElementById('voiceBtn');
        this.outputText = document.getElementById('outputText');
        this.languageSelect = document.getElementById('language');
        this.continuousCheckbox = document.getElementById('continuous');
        this.interimResultsCheckbox = document.getElementById('interimResults');
        this.statusText = document.querySelector('.status-text');
        this.statusDot = document.querySelector('.status-dot');
        this.visualizer = document.getElementById('visualizer');
        this.charCount = document.getElementById('charCount');
        this.historyList = document.getElementById('historyList');
        this.copyBtn = document.getElementById('copyBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
    }

    initRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = this.languageSelect.value;
            
            this.recognition.onstart = () => this.onSpeechStart();
            this.recognition.onend = () => this.onSpeechEnd();
            this.recognition.onresult = (event) => this.onSpeechResult(event);
            this.recognition.onerror = (event) => this.onSpeechError(event);
        } else {
            this.voiceBtn.disabled = true;
            this.voiceBtn.innerHTML = '<span class="btn-text">浏览器不支持语音识别</span>';
            this.statusText.textContent = '不支持';
            this.statusDot.style.background = '#dc3545';
            alert('您的浏览器不支持语音识别功能，请使用 Chrome、Edge 或 Safari 浏览器。');
        }
    }

    bindEvents() {
        this.voiceBtn.addEventListener('click', () => this.toggleRecording());
        
        this.languageSelect.addEventListener('change', () => {
            if (this.recognition) {
                this.recognition.lang = this.languageSelect.value;
            }
        });

        this.continuousCheckbox.addEventListener('change', () => {
            if (this.recognition) {
                this.recognition.continuous = this.continuousCheckbox.checked;
            }
        });

        this.interimResultsCheckbox.addEventListener('change', () => {
            if (this.recognition) {
                this.recognition.interimResults = this.interimResultsCheckbox.checked;
            }
        });

        this.outputText.addEventListener('input', () => {
            this.updateCharCount();
        });

        this.copyBtn.addEventListener('click', () => this.copyText());
        this.clearBtn.addEventListener('click', () => this.clearText());
        this.downloadBtn.addEventListener('click', () => this.downloadText());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }

    toggleRecording() {
        if (!this.recognition) return;

        if (this.isRecording) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    onSpeechStart() {
        this.isRecording = true;
        this.voiceBtn.classList.add('recording');
        this.voiceBtn.querySelector('.btn-text').textContent = '停止语音输入';
        this.statusText.textContent = '正在聆听...';
        this.statusDot.classList.add('listening');
        this.visualizer.classList.add('active');
    }

    onSpeechEnd() {
        this.isRecording = false;
        this.voiceBtn.classList.remove('recording');
        this.voiceBtn.querySelector('.btn-text').textContent = '开始语音输入';
        this.statusText.textContent = '就绪';
        this.statusDot.classList.remove('listening');
        this.visualizer.classList.remove('active');
        
        if (this.finalTranscript && this.continuousCheckbox.checked) {
            this.saveToHistory(this.finalTranscript);
        }
    }

    onSpeechResult(event) {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                this.finalTranscript += transcript;
                this.appendText(transcript);
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (interimTranscript) {
            this.showInterimText(interimTranscript);
        }
    }

    appendText(text) {
        const currentText = this.outputText.value;
        if (currentText && !currentText.endsWith(' ') && !currentText.endsWith('\n')) {
            this.outputText.value += ' ' + text;
        } else {
            this.outputText.value += text;
        }
        this.updateCharCount();
    }

    showInterimText(text) {
        const currentText = this.outputText.value;
        const tempElement = document.createElement('div');
        tempElement.textContent = text;
        this.outputText.setAttribute('placeholder', '识别中：' + text);
    }

    onSpeechError(event) {
        console.error('Speech recognition error:', event.error);
        
        let errorMessage = '语音识别出错';
        switch (event.error) {
            case 'no-speech':
                errorMessage = '未检测到语音，请再试一次';
                break;
            case 'audio-capture':
                errorMessage = '无法访问麦克风，请检查权限设置';
                break;
            case 'not-allowed':
                errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许';
                break;
            case 'network':
                errorMessage = '网络错误，请检查网络连接';
                break;
            case 'aborted':
                errorMessage = '语音识别已取消';
                break;
            default:
                errorMessage = `错误：${event.error}`;
        }
        
        this.statusText.textContent = errorMessage;
        this.statusDot.style.background = '#ffc107';
        
        setTimeout(() => {
            if (!this.isRecording) {
                this.statusDot.style.background = '#28a745';
            }
        }, 3000);
    }

    updateCharCount() {
        const text = this.outputText.value;
        this.charCount.textContent = text.length;
    }

    copyText() {
        const text = this.outputText.value;
        if (!text) {
            this.showToast('没有可复制的内容');
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            this.showToast('已复制到剪贴板 ✓');
        }).catch(() => {
            this.outputText.select();
            document.execCommand('copy');
            this.showToast('已复制到剪贴板 ✓');
        });
    }

    clearText() {
        if (!this.outputText.value) return;
        
        if (confirm('确定要清空文本吗？')) {
            this.outputText.value = '';
            this.updateCharCount();
            this.showToast('已清空');
        }
    }

    downloadText() {
        const text = this.outputText.value;
        if (!text) {
            this.showToast('没有可下载的内容');
            return;
        }

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `语音输入_${this.formatDate(new Date())}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('已下载 ✓');
    }

    saveToHistory(text) {
        if (!text.trim()) return;

        const historyItem = {
            id: Date.now(),
            text: text.trim(),
            timestamp: new Date()
        };

        this.history.unshift(historyItem);
        
        if (this.history.length > 20) {
            this.history = this.history.slice(0, 20);
        }

        this.saveHistory();
        this.renderHistory();
    }

    loadHistory() {
        const saved = localStorage.getItem('voiceInputHistory');
        if (saved) {
            try {
                this.history = JSON.parse(saved);
                this.renderHistory();
            } catch (e) {
                console.error('Failed to load history:', e);
            }
        }
    }

    saveHistory() {
        localStorage.setItem('voiceInputHistory', JSON.stringify(this.history));
    }

    renderHistory() {
        if (this.history.length === 0) {
            this.historyList.innerHTML = '<p class="empty-hint">暂无历史记录</p>';
            return;
        }

        this.historyList.innerHTML = this.history.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="timestamp">${this.formatDate(new Date(item.timestamp))}</div>
                <div class="text">${this.escapeHtml(item.text)}</div>
            </div>
        `).join('');

        this.historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const historyItem = this.history.find(h => h.id === parseInt(item.dataset.id));
                if (historyItem) {
                    this.outputText.value = historyItem.text;
                    this.updateCharCount();
                    this.showToast('已加载历史记录');
                }
            });
        });
    }

    clearHistory() {
        if (this.history.length === 0) return;
        
        if (confirm('确定要清空历史记录吗？')) {
            this.history = [];
            this.saveHistory();
            this.renderHistory();
            this.showToast('历史记录已清空');
        }
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            animation: fadeInOut 2s ease-in-out;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VoiceInputApp();
});
