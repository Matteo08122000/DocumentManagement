export async function getCsrfToken(): Promise<string> {
  const res = await fetch("http://localhost:5000/api/csrf-token", {
    credentials: "include",
  });
  const data = await res.json();
  return data.csrfToken;
}
