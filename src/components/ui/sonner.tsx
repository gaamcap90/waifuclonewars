import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      offset="80px"
      toastOptions={{
        style: {
          background: "rgba(4,2,22,0.97)",
          border: "1px solid rgba(120,60,200,0.55)",
          color: "#c4b5fd",
          fontFamily: "'Exo 2', sans-serif",
          fontSize: "13px",
          boxShadow: "0 0 18px rgba(100,40,180,0.30), 0 4px 24px rgba(0,0,0,0.75)",
          borderRadius: "8px",
          backdropFilter: "blur(8px)",
        },
        classNames: {
          error: "game-toast-error",
          success: "game-toast-success",
          warning: "game-toast-warning",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
export { toast } from "sonner"
