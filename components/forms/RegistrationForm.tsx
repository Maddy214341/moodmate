"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { RegistrationAction } from "./RegistrationFormAction"
import { useState } from "react"
import { toast } from "sonner"

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.string().email({message:"Not a valid email"}),
  password: z.string(),
  confirmPassword: z.string()
}).superRefine(({ confirmPassword, password }, ctx) => {
  if (confirmPassword !== password) {
    ctx.addIssue({
      code: "custom",
      message: "The passwords did not match",
      path: ['confirmPassword']
    });
  }
});

export function RegistrationForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
const [submitting, isSubmitting] = useState(false)
  
  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email:"",
      password:"",
      confirmPassword:""
    },
  })
 
  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    isSubmitting(true)
    const res = await RegistrationAction(values.username, values.email, values.password)
    isSubmitting(false)
    toast(res.message)
  }

  return (
    <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create your account</h1>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
          <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl>
              <Input placeholder="Enter your username" {...field} />
            </FormControl>
            <FormDescription>This is your public display name.</FormDescription>
            <FormMessage />
          </FormItem>
            )}
          />
        </div>
        <div className="grid gap-2">
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
        </div>
        <div className="grid gap-2">
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
        </div>
        <div className="grid gap-2">
        <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
          <FormItem>
            <FormLabel>Confirm Password</FormLabel>
            <FormControl>
              <Input type="password" placeholder="Confirm your password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          Register
        </Button>
      </div>
      <div className="text-center text-sm">
        Already have an account?
        <Link href="/login" className="underline underline-offset-4">
          Log in
        </Link>
      </div>
      </form>
      </Form>
  )
}
