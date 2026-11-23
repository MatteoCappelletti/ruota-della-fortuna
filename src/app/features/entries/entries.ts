import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-entry-list',
  templateUrl: './entries.html',
  styleUrl: './entries.css',
})
export class EntryList {
  readonly entries = input.required<string[]>();
  readonly disabled = input(false);
  readonly storageMessage = input('');
  readonly entryAdded = output<string>();
  readonly entryRemoved = output<number>();
  readonly saveRequested = output<void>();
  readonly restoreRequested = output<void>();

  protected readonly draft = signal('');

  protected addEntry(event: SubmitEvent): void {
    event.preventDefault();
    const entry = this.draft().trim();
    if (!entry || this.disabled()) return;

    this.entryAdded.emit(entry);
    this.draft.set('');
  }

  protected updateDraft(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }
}
