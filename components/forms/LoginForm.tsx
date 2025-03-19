"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { useState } from "react"
import { toast } from "sonner"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

const formSchema = z.object({
  email: z.string().email({ message: "Not a valid email" }),
  password: z.string(),
})

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"form">) {
  const [submitting, setSubmitting] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const router = useRouter()

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setSubmitting(true)

    const res = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false, // Prevents automatic redirect so we can handle errors
    })

    if (res?.error) {
      toast.error(res.error)
      setSubmitting(false)
    } else {
      toast.success("Login successful!")
      router.push("/chatbot") // Redirect to chatbot after successful login
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Welcome back</h1>
        </div>
        <div className="grid gap-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter your password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Logging in..." : "Login"}
          </Button>
        </div>
        <div className="text-center text-sm">
          Don't have an account?
          <Link href="/register" className="underline underline-offset-4">
            Sign up
          </Link>
        </div>
      </form>
    </Form>
  )
}
