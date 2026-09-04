"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { StateBlock } from "@/components/feedback/state-block";
import { useDictionary } from "@/lib/i18n/dictionary-context";

interface SectionBoundaryProps {
  children: ReactNode;
  /** Replaces the default message — say which part of the page is missing. */
  title?: string;
  hint?: string;
}

interface InnerProps extends SectionBoundaryProps {
  title: string;
  hint: string;
}

interface SectionBoundaryState {
  failed: boolean;
}

/**
 * Keeps one section's crash to that section.
 *
 * React Query's `isError` already covers a request that fails; this covers what
 * it cannot — a render that throws, usually on a payload shaped differently
 * than the mappers expect. Until now the only boundary was `app/error.tsx`, so
 * a single malformed comment took down the title page around it, artwork,
 * synopsis and all.
 *
 * A class component because that is still the only way to catch a render error;
 * there is no hook equivalent.
 */
class SectionBoundaryInner extends Component<InnerProps, SectionBoundaryState> {
  state: SectionBoundaryState = { failed: false };

  static getDerivedStateFromError(): SectionBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Section failed to render:", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <StateBlock title={this.props.title} hint={this.props.hint} className="py-12" />
    );
  }
}

/**
 * Resolves the copy, then hands it to the class above.
 *
 * Catching a render error still requires a class component, and a class cannot
 * call `useDictionary` — so the translation happens out here and arrives as
 * plain props.
 */
export function SectionBoundary({ children, title, hint }: SectionBoundaryProps) {
  const t = useDictionary();

  return (
    <SectionBoundaryInner
      title={title ?? t.error.section}
      hint={hint ?? t.error.sectionHint}
    >
      {children}
    </SectionBoundaryInner>
  );
}
