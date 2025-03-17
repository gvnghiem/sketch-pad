/**
 * CanvasHistory class
 * Handles undo/redo functionality for the sketch app
 */
class CanvasHistory {
    constructor(canvas, maxSteps = 20) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.maxSteps = maxSteps;
        this.undoStack = [];
        this.redoStack = [];
        this.isPerformingUndoRedo = false;

        // Save initial state
        this.saveState();
    }

    /**
     * Captures the current canvas state and adds it to the undo stack
     */
    saveState() {
        // If already performing undo/redo, don't save intermediate states
        if (this.isPerformingUndoRedo) return;

        // If undo stack is at max capacity, remove oldest state
        if (this.undoStack.length >= this.maxSteps) {
            this.undoStack.shift();
        }

        // Save current state
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.undoStack.push(imageData);

        // Clear redo stack when a new action is performed
        this.redoStack = [];

        // Update button states
        this.updateButtonStates();
    }

    /**
     * Undoes the last canvas action
     */
    undo() {
        if (this.undoStack.length <= 1) return; // Keep at least the initial state

        this.isPerformingUndoRedo = true;

        // Move current state to redo stack
        const currentState = this.undoStack.pop();
        this.redoStack.push(currentState);

        // Apply previous state
        const previousState = this.undoStack[this.undoStack.length - 1];
        this.ctx.putImageData(previousState, 0, 0);

        this.isPerformingUndoRedo = false;
        this.updateButtonStates();
    }

    /**
     * Redoes a previously undone canvas action
     */
    redo() {
        if (this.redoStack.length === 0) return;

        this.isPerformingUndoRedo = true;

        // Get state from redo stack
        const nextState = this.redoStack.pop();

        // Apply it to canvas and add to undo stack
        this.ctx.putImageData(nextState, 0, 0);
        this.undoStack.push(nextState);

        this.isPerformingUndoRedo = false;
        this.updateButtonStates();
    }

    /**
     * Updates the enabled/disabled state of undo/redo buttons
     */
    updateButtonStates() {
        const undoBtn = document.getElementById('undo');
        const redoBtn = document.getElementById('redo');

        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length <= 1;
            undoBtn.classList.toggle('disabled', this.undoStack.length <= 1);
        }

        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
            redoBtn.classList.toggle('disabled', this.redoStack.length === 0);
        }
    }

    /**
     * Clears all history stacks when canvas is cleared
     */
    clearHistory() {
        // Keep only the current (cleared) state
        const currentState = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.undoStack = [currentState];
        this.redoStack = [];
        this.updateButtonStates();
    }
}
