import { fetchEndpoint } from "../FetchEndpoint";

describe("fetchEndpoint", () => {
  const originalFetch = global.fetch as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  afterAll(() => {
    (global as any).fetch = originalFetch;
  });

  it("performs GET with token and returns JSON", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ ok: true }),
    });

    const res = await fetchEndpoint("/ping", "GET", "abc");
    expect(res).toEqual({ ok: true });

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("http://localhost:3000/ping");
    expect(options.method).toBe("GET");
    expect(options.credentials).toBe("include");
    expect(options.headers.Authorization).toBe("Bearer abc");
    expect(options.headers["Content-Type"]).toBeUndefined();
  });

  it("POST with JSON body sets content-type and stringified body", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ success: true }),
    });

    const body = { a: 1 };
    const res = await fetchEndpoint("/json", "POST", "tok", body);
    expect(res).toEqual({ success: true });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.body).toBe(JSON.stringify(body));
  });

  it("POST with FormData does not set content-type and passes FormData as body", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ uploaded: true }),
    });

    const fd = new FormData();
    fd.append("file", new Blob(["x"]) as any, "a.txt");
    const res = await fetchEndpoint("/upload", "POST", "tok", fd);
    expect(res).toEqual({ uploaded: true });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(options.body).toBe(fd);
  });

  it("throws an HTTP error on non-ok response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ message: "Invalid" }),
    });

    await expect(fetchEndpoint("/bad", "GET")).rejects.toThrow(
      "HTTP error 400: Bad Request"
    );
  });

  it("throws HTTP error with statusText when error body is not JSON", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("not json");
      },
    });

    await expect(fetchEndpoint("/boom", "GET")).rejects.toThrow(
      "HTTP error 500: Internal Server Error"
    );
  });

  it("returns null for 204 No Content", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      statusText: "No Content",
      json: async () => null,
    });

    const res = await fetchEndpoint("/nocontent", "DELETE");
    expect(res).toBeNull();
  });

  it("throws for invalid JSON on success", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => {
        throw new Error("parse fail");
      },
    });

    await expect(fetchEndpoint("/weird", "GET")).rejects.toThrow(
      "Invalid JSON response from server"
    );
  });
});
