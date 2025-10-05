import { login } from "@/services/auth";
import { authTheUserId } from "@/services/kanbanApi";
import { useRouter } from "next/router";
import { useContext, useEffect } from "react";
import KanbanContext from "../../../context/kanbanContext";

export default function Auth() {
  const { handleSetUserInfo } = useContext(KanbanContext);
  const router = useRouter();

  const { fkpoid } = router.query as { fkpoid: string | null };

  const fkpoidAsNumber =
    fkpoid !== null && !isNaN(parseInt(fkpoid as string, 10))
      ? parseInt(fkpoid as string, 10)
      : null;

  useEffect(() => {
    const run = async () => {
      if (fkpoidAsNumber == null) return;

      // 1) Login to mint the JWT (demo creds from README)
      const loginRes = await login("admin@kanban.com", "admin123");

      // backend README says login returns { success, data: { user, token } }
      const loggedInUserId =
        loginRes?.data?.user?.id ?? loginRes?.data?.data?.user?.id;

      if (!loggedInUserId) {
        console.error("No user id from login");
        router.push("/unauthorized");
        return;
      }

      // 2) Use the id from login (NOT the id from the URL) for project access
      const res = await authTheUserId(fkpoidAsNumber, Number(loggedInUserId));

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token || res?.status !== 200 || !res?.data) {
        router.push("/unauthorized");
        return;
      }

      // 3) Continue as before
      handleSetUserInfo(res.data);
      window.sessionStorage.setItem("userData", JSON.stringify(res.data));
      router.push(`/boardList/${res.data.fkpoid}`);
    };

    run();
  }, [fkpoidAsNumber]);

  return null;
}
