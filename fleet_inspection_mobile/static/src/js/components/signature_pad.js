/** @odoo-module **/

import { Component, useState, onMounted, onWillUnmount, useRef } from "@odoo/owl";

/**
 * Digital Signature Pad Component
 * 
 * Provides touch-enabled signature capture for mobile devices
 */
export class SignaturePad extends Component {
    static template = "fleet_inspection_mobile.SignaturePad";
    
    setup() {
        this.canvasRef = useRef("canvas");
        
        this.state = useState({
            isDrawing: false,
            isEmpty: true,
            lastX: 0,
            lastY: 0,
        });

        this.strokeHistory = [];
        this.currentStroke = [];
        
        onMounted(this.onMounted);
        onWillUnmount(this.onWillUnmount);
    }

    onMounted() {
        this.canvas = this.canvasRef.el;
        this.ctx = this.canvas.getContext('2d');
        
        // Setup canvas
        this.setupCanvas();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    onWillUnmount() {
        this.removeEventListeners();
    }

    setupCanvas() {
        // Set canvas size
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        
        // Scale context for high DPI displays
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Set drawing properties
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        
        // Set canvas style
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
    }

    setupEventListeners() {
        // Mouse events (for desktop)
        this.canvas.addEventListener('mousedown', this.handleStart.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleEnd.bind(this));
        this.canvas.addEventListener('mouseout', this.handleEnd.bind(this));

        // Touch events (for mobile)
        this.canvas.addEventListener('touchstart', this.handleStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleEnd.bind(this));
        this.canvas.addEventListener('touchcancel', this.handleEnd.bind(this));

        // Prevent default touch behavior
        this.canvas.addEventListener('touchstart', this.preventDefault.bind(this));
        this.canvas.addEventListener('touchmove', this.preventDefault.bind(this));
    }

    removeEventListeners() {
        if (this.canvas) {
            this.canvas.removeEventListener('mousedown', this.handleStart);
            this.canvas.removeEventListener('mousemove', this.handleMove);
            this.canvas.removeEventListener('mouseup', this.handleEnd);
            this.canvas.removeEventListener('mouseout', this.handleEnd);
            this.canvas.removeEventListener('touchstart', this.handleStart);
            this.canvas.removeEventListener('touchmove', this.handleMove);
            this.canvas.removeEventListener('touchend', this.handleEnd);
            this.canvas.removeEventListener('touchcancel', this.handleEnd);
            this.canvas.removeEventListener('touchstart', this.preventDefault);
            this.canvas.removeEventListener('touchmove', this.preventDefault);
        }
    }

    preventDefault(event) {
        event.preventDefault();
    }

    getEventPos(event) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = event.clientX || (event.touches && event.touches[0].clientX);
        const clientY = event.clientY || (event.touches && event.touches[0].clientY);
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    handleStart(event) {
        this.state.isDrawing = true;
        const pos = this.getEventPos(event);
        
        this.state.lastX = pos.x;
        this.state.lastY = pos.y;
        
        // Start new stroke
        this.currentStroke = [{ x: pos.x, y: pos.y, type: 'start' }];
        
        // Begin path
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
    }

    handleMove(event) {
        if (!this.state.isDrawing) return;
        
        const pos = this.getEventPos(event);
        
        // Draw line
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
        
        // Add to current stroke
        this.currentStroke.push({ x: pos.x, y: pos.y, type: 'move' });
        
        this.state.lastX = pos.x;
        this.state.lastY = pos.y;
    }

    handleEnd(event) {
        if (!this.state.isDrawing) return;
        
        this.state.isDrawing = false;
        this.state.isEmpty = false;
        
        // End current stroke
        if (this.currentStroke.length > 0) {
            this.currentStroke.push({ type: 'end' });
            this.strokeHistory.push([...this.currentStroke]);
            this.currentStroke = [];
        }
        
        // Notify parent component
        if (this.props.onSignatureChanged) {
            this.props.onSignatureChanged(this.getSignatureData());
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.strokeHistory = [];
        this.currentStroke = [];
        this.state.isEmpty = true;
        
        if (this.props.onSignatureChanged) {
            this.props.onSignatureChanged(null);
        }
    }

    getSignatureData() {
        if (this.state.isEmpty) {
            return null;
        }
        
        return {
            dataUrl: this.canvas.toDataURL('image/png'),
            strokes: this.strokeHistory,
            timestamp: new Date().toISOString(),
            dimensions: {
                width: this.canvas.width,
                height: this.canvas.height
            }
        };
    }

    setSignatureData(signatureData) {
        if (!signatureData || !signatureData.strokes) {
            this.clear();
            return;
        }

        this.clear();
        
        // Redraw strokes
        signatureData.strokes.forEach(stroke => {
            this.ctx.beginPath();
            
            stroke.forEach((point, index) => {
                if (point.type === 'start' || index === 0) {
                    this.ctx.moveTo(point.x, point.y);
                } else if (point.type === 'move') {
                    this.ctx.lineTo(point.x, point.y);
                    this.ctx.stroke();
                }
            });
        });
        
        this.strokeHistory = signatureData.strokes;
        this.state.isEmpty = false;
    }

    undo() {
        if (this.strokeHistory.length === 0) return;
        
        this.strokeHistory.pop();
        
        // Redraw canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.strokeHistory.forEach(stroke => {
            this.ctx.beginPath();
            
            stroke.forEach((point, index) => {
                if (point.type === 'start' || index === 0) {
                    this.ctx.moveTo(point.x, point.y);
                } else if (point.type === 'move') {
                    this.ctx.lineTo(point.x, point.y);
                    this.ctx.stroke();
                }
            });
        });
        
        this.state.isEmpty = this.strokeHistory.length === 0;
        
        if (this.props.onSignatureChanged) {
            this.props.onSignatureChanged(this.state.isEmpty ? null : this.getSignatureData());
        }
    }

    setLineWidth(width) {
        this.ctx.lineWidth = width;
    }

    setLineColor(color) {
        this.ctx.strokeStyle = color;
    }

    isEmpty() {
        return this.state.isEmpty;
    }

    // Event handlers for template
    onClearClick() {
        this.clear();
    }

    onUndoClick() {
        this.undo();
    }
}