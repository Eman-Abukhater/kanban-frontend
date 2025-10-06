export const getServerSideProps: GetServerSideProps = async () => ({ props: {} });
import type { InferGetServerSidePropsType, GetServerSideProps } from "next";
import { useState, useEffect, useMemo } from "react";
import AddEditBoardModal from "../../components/modal/AddEditBoardModal";
import { useRouter } from "next/router";
import {
  fetchInitialBoards,
  AddBoard,
  EditBoard,
} from "../../services/kanbanApi";
import { ToastContainer, toast } from "react-toastify";
import dynamic from 'next/dynamic';
const LottieClient = dynamic(() => import('@/components/LottieClient'), { ssr: false });
import animation_space from "../../../public/animationTeam2.json";
import animationSettings from "../../../public/animationNote.json";
import KanbanContext from "../../context/kanbanContext";
import { useContext } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import LoadingPage2 from "@/components/layout/LoadingPage2";

export default function getBoardList() {
  const {
    userInfo,
    handleSetUserInfo,
    signalRConnection,
    setSignalRConnection,
    setUsersOnline,
  } = useContext(KanbanContext);

  const router = useRouter();

  // Wait for router, then coerce id -> number (fkpoid)
  const fkpoid = useMemo(() => {
    if (!router.isReady) return null as number | null;
    const raw = router.query.id;
    const val = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }, [router.isReady, router.query.id]);

  const [boards, setBoards] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [board, setBoard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ---- Fetch boards (REAL API) ----
  const fetchData = async () => {
    if (fkpoid == null) return;
    try {
      setIsLoading(true);
      const res = await fetchInitialBoards(fkpoid); // <-- pass NUMBER
      if (res?.status === 200) {
        setBoards(Array.isArray(res.data) ? res.data : []);
      } else {
        toast.error("Could not fetch the data.", { position: toast.POSITION.TOP_CENTER });
      }
    } catch (e: any) {
      toast.error(`Fetch error: ${e?.message ?? "unknown"}`, { position: toast.POSITION.TOP_CENTER });
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Auth + initial fetch + SignalR ----
  useEffect(() => {
    if (!router.isReady) return;

    // 1) Auth check (original behavior)
    const checkUserExist = async () => {
      if (!userInfo) {
        const stored = window.sessionStorage.getItem("userData");
        if (!stored) {
          router.push(`/unauthorized`);
          return;
        }
        const u = JSON.parse(stored);
        router.push(`/auth/${u.fkpoid}/${u.userid}`);
        return;
      }
    };

    checkUserExist();
    fetchData();
    // 2) SignalR setup
    if (!signalRConnection && userInfo) {
      const joinRoom = async (
        userid: string,
        fkpoidStr: string | null,
        userName: string
      ) => {
        try {
          const connection = new HubConnectionBuilder()
            .withUrl("https://empoweringatt.ddns.net:4070/board")
            .configureLogging(LogLevel.Information)
            .build();
          connection.serverTimeoutInMilliseconds = 1800000;
          connection.keepAliveIntervalInMilliseconds = 1800000;
          await connection.start();

          connection.on("UserInOutMsg", (message) => {
            toast.dark(`${message}`, { position: toast.POSITION.TOP_LEFT });
          });

          connection.on("UsersInBoard", (users) => {
            setUsersOnline(users);
          });

          await connection.invoke("JoinBoardGroup", {
            fkpoid: fkpoidStr ?? fkpoid?.toString(),
            userid: userid?.toString(),
            username: userName,
            userPic: userInfo.userpic,
          });

          setSignalRConnection(connection);
        } catch (e) {
          console.log(e);
        }
      };
      joinRoom(userInfo.userid, userInfo.fkpoid, userInfo.username);
    }

    // live update: refetch on add/edit
    if (signalRConnection) {
      const handler = async (_message: string) => {
        toast.info(`${_message}`, { position: toast.POSITION.TOP_RIGHT });
        await fetchData();
      };
      signalRConnection.on("addEditBoard", handler);
      return () => {
        signalRConnection.off("addEditBoard", handler);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, fkpoid, userInfo, signalRConnection]);

  const openEditModal = (b: any) => {
    setBoard(b);
    setIsModalOpen(true);
  };
  const closeEditModal = () => {
    setBoard(null);
    setIsModalOpen(false);
  };

  const handleEditTitle = async (newTitle: string, boardId: number) => {
    const res = await EditBoard(newTitle, boardId, userInfo.username);
    if (res?.status !== 200 || !res?.data) {
      toast.error("Failed to edit board.", { position: toast.POSITION.TOP_CENTER });
      return;
    }
    // Update local state
    setBoards(prev =>
      prev.map(b => (b.boardId === boardId ? { ...b, title: newTitle } : b))
    );
    toast.success(`${res.data}`, { position: toast.POSITION.TOP_CENTER });
    closeEditModal();
  };

  const handleAddBoardClick = async (newTitle: string) => {
    console.log("🧩 userInfo when adding board:", userInfo);
    const res = await AddBoard(newTitle, fkpoid, userInfo.id, userInfo.username);
    if (res?.status !== 200 || !res?.data) {
      toast.error("Failed to add board.", { position: toast.POSITION.TOP_CENTER });
      return;
    }
    setBoards(prev => [...prev, { boardId: res.data, title: newTitle }]);
    toast.success(`Board ID: ${res.data} Created Successfully`, {
      position: toast.POSITION.TOP_CENTER,
    });
  };

  return (
    <>
      {isLoading && <LoadingPage2 />}

      {!isLoading && (
        <div className="flex h-screen flex-col bg-gray-100">
          <div className="flex items-center justify-center bg-gray-100" style={{ marginTop: "-13px" }}>
            <div className="w-full max-w-md space-y-4 p-4">
              <div className="flex items-center justify-center bg-gray-100" style={{ height: "273px" }}>
              <LottieClient animationData={animation_space} loop />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center bg-gray-100" style={{ marginTop: "-33px" }}>
            <div className="w-full max-w-4xl space-y-4 p-4">
              <h1
                className="rounded-lg bg-gradient-to-r from-white to-blue-500 text-center text-3xl text-white shadow-lg"
                style={{ position: "relative" }}
              >
                <div className="flex items-center justify-center" style={{ width: "67px" }}>
                <LottieClient animationData={animationSettings} loop />
                </div>
                <div className="btn-shine">
                  <span>Board P.O {fkpoid ?? ""}</span>
                </div>
              </h1>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {boards?.map((b: any, index: number) => (
                  <div
                    key={index}
                    className="relative flex items-center justify-between rounded-md bg-white p-4 shadow-md hover:shadow-lg"
                  >
                    <h2 className="truncate text-lg font-semibold">
                      <span className="block text-xs text-gray-500">ID: {b.boardId}</span>
                      {b.title}
                    </h2>

                    <div className="right-2 top-2 flex items-center space-x-3">
                      <button
                        className="rounded-full bg-yellow-500 p-2 text-white focus:outline-none hover:bg-yellow-600"
                        onClick={() => openEditModal(b)}
                      >
                        {/* pencil icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>

                      <button
                        className="rounded-full bg-blue-500 p-2 text-white focus:outline-none hover:bg-blue-600"
                        onClick={() => {
                          // carry board context and navigate
                          handleSetUserInfo({
                            ...userInfo,
                            boardTitle: b.title,
                            fkboardid: b.boardId,
                          });
                          router.push(`/kanbanList/${b.boardId}`);
                        }}
                      >
                        {/* eye icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {boards?.length < 21 && (
                <button
                  className="fixed bottom-4 right-4 rounded-full bg-green-500 p-4 text-white focus:outline-none hover:bg-blue-600"
                  onClick={() => openEditModal("")}
                >
                  {/* plus icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              )}

              <AddEditBoardModal
                isOpen={isModalOpen}
                onClose={closeEditModal}
                handleEditTitle={(newTitle: string, boardId: number) => handleEditTitle(newTitle, boardId)}
                handleAddBoardClick={handleAddBoardClick}
                board={board}
              />
              <div style={{ marginBottom: "72px" }} />
            </div>
            <ToastContainer />
          </div>
        </div>
      )}
    </>
  );
}
