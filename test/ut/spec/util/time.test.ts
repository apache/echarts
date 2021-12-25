import { format } from "@/src/util/time";

describe("util/time", () => {
    describe("format", () => {
        it("template", () => {
            expect(format("2021-12-25T00:00:00Z", "yyyy-MM-dd", true)).toEqual("2021-12-25");
        });
    });
});
