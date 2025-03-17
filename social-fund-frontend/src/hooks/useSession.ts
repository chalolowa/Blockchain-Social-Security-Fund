import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@nfid/identitykit/react";
import { isAuthenticated } from "@/services/icpService";

export const useSession = (requiredRole?: 'employee' | 'employer') => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const verifySession = async () => {
      if (!user || !isAuthenticated) {
        router.push("/");
        return;
      }
      
      try {
        const valid = await isAuthenticated(user.principal.toText());
        if (!valid) {
          localStorage.removeItem("userDetails");
          router.push("/");
        }

        if (requiredRole) {
          const storedRole = localStorage.getItem("userDetails")?.role;
          if (storedRole !== requiredRole) {
            router.push(storedRole === "employer" ? "/employer" : "/employee");
          }
        }
      } catch (error) {
        console.error("Session verification failed:", error);
        router.push("/");
      }
    };

    verifySession();
  }, [user, isAuthenticated, requiredRole, router]);

  return { user, isAuthenticated };
};