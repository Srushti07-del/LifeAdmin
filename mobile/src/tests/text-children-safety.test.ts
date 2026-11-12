/**
 * Regression tests for React Native "Text strings must be rendered within a <Text> component."
 * Covers shared text-child normalization used by Button.tsx and Badge.tsx, including
 * numbers (0), interpolated arrays, fragments, whitespace, and falsy icon slots.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { hasRenderableNode, renderTextSafeChildren } from '../utils/textChildren';

const MOBILE_ROOT = path.resolve(__dirname, '../..');

function readMobileFile(relPath: string): string {
  return fs.readFileSync(path.join(MOBILE_ROOT, relPath), 'utf8');
}

const FakeText = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('Text', null, children);

const FakeIcon = () => React.createElement('Icon', null);

function wrapInFakeText(content: React.ReactNode, key: string): React.ReactNode {
  return React.createElement(FakeText, { key }, content);
}

describe('Text-safe React Native children normalization', () => {
  it('wraps single strings and numbers (including 0) cleanly inside Text', () => {
    const strOut = renderTextSafeChildren('Save Event', wrapInFakeText);
    assert.ok(React.isValidElement<{ children?: React.ReactNode }>(strOut));
    assert.strictEqual(strOut.type, FakeText);
    assert.strictEqual(strOut.props.children, 'Save Event');

    const zeroOut = renderTextSafeChildren(0, wrapInFakeText);
    assert.ok(React.isValidElement<{ children?: React.ReactNode }>(zeroOut));
    assert.strictEqual(zeroOut.type, FakeText);
    assert.strictEqual(zeroOut.props.children, 0);
  });

  it('coalesces interpolated arrays and Fragments into a single Text without leaking bare strings', () => {
    // Matches JSX like: <Badge>{priority} Priority</Badge> or <Button>Confirm ({count})</Button>
    const arrayOut = renderTextSafeChildren(['High', ' Priority'], wrapInFakeText);
    assert.ok(React.isValidElement<{ children?: React.ReactNode }>(arrayOut));
    assert.strictEqual(arrayOut.type, FakeText);
    assert.deepStrictEqual(arrayOut.props.children, ['High', ' Priority']);

    const fragNode = React.createElement(
      React.Fragment,
      null,
      'Confirm (',
      3,
      ')'
    );
    const fragOut = renderTextSafeChildren(fragNode, wrapInFakeText);
    assert.ok(React.isValidElement<{ children?: React.ReactNode }>(fragOut));
    assert.strictEqual(fragOut.type, FakeText);
    assert.deepStrictEqual(fragOut.props.children, ['Confirm (', 3, ')']);
  });

  it('drops whitespace-only / boolean / null nodes while keeping visible sibling text in Text', () => {
    const emptyOut = renderTextSafeChildren(
      ['   ', '\n', false, null, undefined],
      wrapInFakeText
    );
    assert.strictEqual(emptyOut, null);

    const iconEl = React.createElement(FakeIcon, { key: 'icon' });
    const mixedOut = renderTextSafeChildren(
      ['\n  ', iconEl, false, ' Save'],
      wrapInFakeText
    );
    assert.ok(Array.isArray(mixedOut));
    assert.strictEqual(mixedOut.length, 2);
    assert.strictEqual(mixedOut[0], iconEl);
    assert.ok(React.isValidElement<{ children?: React.ReactNode }>(mixedOut[1]));
    assert.strictEqual(mixedOut[1].type, FakeText);
    assert.strictEqual(mixedOut[1].props.children, ' Save');
  });

  it('preserves existing React elements without re-wrapping them', () => {
    const customText = React.createElement(FakeText, null, 'Custom Label');
    const out = renderTextSafeChildren(customText, wrapInFakeText);
    assert.strictEqual(out, customText);
  });

  it('prevents falsy 0 or empty string slots from rendering in icon / rightIcon slots', () => {
    assert.strictEqual(hasRenderableNode(undefined), false);
    assert.strictEqual(hasRenderableNode(null), false);
    assert.strictEqual(hasRenderableNode(false), false);
    assert.strictEqual(hasRenderableNode(0), false);
    assert.strictEqual(hasRenderableNode(''), false);
    assert.strictEqual(hasRenderableNode('   '), false);
    assert.strictEqual(
      hasRenderableNode(React.createElement(React.Fragment, null, '')),
      false
    );
    assert.strictEqual(hasRenderableNode(React.createElement(FakeIcon)), true);
    assert.strictEqual(hasRenderableNode('+'), true);
  });

  it('keeps Button fragment intact and protects Button and Badge from bare text/number children', () => {
    const buttonSrc = readMobileFile('src/components/ui/Button.tsx');
    const badgeSrc = readMobileFile('src/components/ui/Badge.tsx');

    assert.match(buttonSrc, /<>/);
    assert.match(buttonSrc, /<\/>/);
    assert.match(buttonSrc, /renderTextSafeChildren/);
    assert.match(buttonSrc, /hasRenderableNode/);
    assert.doesNotMatch(buttonSrc, /typeof children === ['"]string['"]/);
    assert.doesNotMatch(buttonSrc, /\bicon && <View/);
    assert.doesNotMatch(buttonSrc, /\brightIcon && \(?\s*<View/);

    assert.match(badgeSrc, /renderTextSafeChildren/);
    assert.doesNotMatch(badgeSrc, /typeof children === ['"]string['"]/);
  });
});

