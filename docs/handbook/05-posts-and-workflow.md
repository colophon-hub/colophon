# Posts, Status, Scheduling, Review, Autosave, and Revisions

Posts are normal editorial records.

## States

**Draft**: saved, non-public.

**Review / in_review**: editorial review state.

**Scheduled**: prepared for future publication.

**Published**: public.

**Archived**: retained but no longer ordinary current content.

**Trash**: removed from ordinary editorial use.

## Actions

**Save Draft** persists draft state.

**Submit for Review** keeps the item non-public and moves workflow to review.

**Preview** saves changes then opens preview.

**Schedule** sets scheduled state.

**Publish** sets publication/workflow to Published.

**Trash** moves an existing item to Trash.

## Autosave

The native editor debounces autosaves to D1. It shows saving, saved-time and failure messages.

If autosave fails, do not reload casually. Use explicit Save Draft and diagnose repeated failures.

## Revisions

Server revision history supports compare and restore.

A restored D1 revision is persisted.

A legacy browser recovery snapshot is only loaded into the editor until Save Draft/Publish succeeds.

## Status versus workflow

They are related but separate fields. The UI aligns them for ordinary actions, but imported/custom records can expose differences.
