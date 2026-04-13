import {describe, expect, it} from "vitest";
import {Tal, Tekst, Sandhed, getHashKey} from "../src/object.js";

describe("Tekst hashKey", () => {
    it("same content produces the same key", () => {
        const a = new Tekst("Hello World");
        const b = new Tekst("Hello World");
        expect(a.hashKey()).toBe(b.hashKey());
    });

    it("different content produces different keys", () => {
        const a = new Tekst("Hello World");
        const b = new Tekst("My name is johnny");
        expect(a.hashKey()).not.toBe(b.hashKey());
    });

    it("empty string has its own key", () => {
        const a = new Tekst("");
        const b = new Tekst(" ");
        expect(a.hashKey()).not.toBe(b.hashKey());
    });
});

describe("Tal hashKey", () => {
    it("same value produces the same key", () => {
        const a = new Tal(42);
        const b = new Tal(42);
        expect(a.hashKey()).toBe(b.hashKey());
    });

    it("different values produce different keys", () => {
        const a = new Tal(1);
        const b = new Tal(2);
        expect(a.hashKey()).not.toBe(b.hashKey());
    });

    it("integer and float with same numeric value produce the same key", () => {
        const a = new Tal(1);
        const b = new Tal(1.0);
        expect(a.hashKey()).toBe(b.hashKey());
    });
});

describe("Sandhed hashKey", () => {
    it("same value produces the same key", () => {
        const a = new Sandhed(true);
        const b = new Sandhed(true);
        expect(a.hashKey()).toBe(b.hashKey());
    });

    it("true and false produce different keys", () => {
        const a = new Sandhed(true);
        const b = new Sandhed(false);
        expect(a.hashKey()).not.toBe(b.hashKey());
    });
});

describe("cross-type hashKey uniqueness", () => {
    it("Tal(1) and Tekst('1') have different keys", () => {
        expect(new Tal(1).hashKey()).not.toBe(new Tekst("1").hashKey());
    });

    it("Sandhed(true) and Tekst('true') have different keys", () => {
        expect(new Sandhed(true).hashKey()).not.toBe(new Tekst("true").hashKey());
    });

    it("Tal(0) and Sandhed(false) have different keys", () => {
        expect(new Tal(0).hashKey()).not.toBe(new Sandhed(false).hashKey());
    });
});

describe("getHashKey", () => {
    it("returns a key for hashable objects", () => {
        expect(getHashKey(new Tekst("x"))).not.toBeNull();
        expect(getHashKey(new Tal(1))).not.toBeNull();
        expect(getHashKey(new Sandhed(true))).not.toBeNull();
    });
});
