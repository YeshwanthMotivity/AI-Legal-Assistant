import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { 
 UserPlus, 
 Users, 
 Shield, 
 ShieldCheck, 
 ShieldAlert,
 Mail,
 User,
 Power,
 MoreVertical,
 Search,
 CheckCircle2,
 AlertCircle,
 Clock,
 Key
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import { adminCreateUser, adminDeactivateUser, adminGetUsers } from '../../api/admin'
import { queryKeys } from '../../api/queryKeys'
import type { AdminCreateUserRequest } from '../../types/admin'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const UserManagement = () => {
 const { t } = useTranslation()
 const queryClient = useQueryClient()
 const [isCreateOpen, setIsCreateOpen] = useState(false)
 const [message, setMessage] = useState('')
 const [messageType, setMessageType] = useState<'success' | 'error'>('success')
 const [form, setForm] = useState<AdminCreateUserRequest>({
 email: '',
 username: '',
 full_name: '',
 role: 'clerk',
 password: '',
 })

 const usersQuery = useQuery({
 queryKey: queryKeys.adminUsers,
 queryFn: () => adminGetUsers({ limit: 500 }),
 })

 const createMutation = useMutation({
 mutationFn: adminCreateUser,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers })
 setMessageType('success')
 setMessage(t('admin.messages.userCreated'))
 setIsCreateOpen(false)
 setForm({ email: '', username: '', full_name: '', role: 'clerk', password: '' })
 },
 onError: () => {
 setMessageType('error')
 setMessage(t('admin.messages.userCreateFailed'))
 },
 })

 const deactivateMutation = useMutation({
 mutationFn: adminDeactivateUser,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers })
 setMessageType('success')
 setMessage(t('admin.messages.userDeactivated'))
 },
 onError: () => {
 setMessageType('error')
 setMessage(t('admin.messages.userDeactivateFailed'))
 },
 })

 return (
 <PortalLayout 
 title={t('admin.pages.usersTitle')} 
 subtitle="Identity and Access Management (IAM) for the Judicial Network."
 >
 <div className="space-y-8">
 {message && (
 <div className={cn(
"p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4",
 messageType === 'error' ?"bg-destructive/10 border-destructive/20 text-destructive":"bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)]"
 )}>
 {messageType === 'error' ? <AlertCircle className="w-5 h-5"/> : <CheckCircle2 className="w-5 h-5"/>}
 <p className="text-sm font-bold tracking-tight">{message}</p>
 </div>
 )}

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
 {/* User List Section */}
 <div className="lg:col-span-8 flex flex-col gap-6">
 <Card className="shadow-lg border-border/50 overflow-hidden flex flex-col">
 <CardHeader className="bg-muted/10 border-b py-5 px-8 flex flex-row items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-primary/10 rounded-lg text-primary">
 <Users className="w-5 h-5"/>
 </div>
 <div>
 <CardTitle className="text-lg">Platform Identities</CardTitle>
 <CardDescription className="text-xs font-medium italic">Active registry of authorized judicial personnel</CardDescription>
 </div>
 </div>
 <Button 
 onClick={() => setIsCreateOpen((prev) => !prev)}
 className="gap-2 shadow-lg shadow-primary/20 font-bold h-10 px-6"
 >
 <UserPlus className="w-4 h-4"/>
 {t('admin.forms.createUser')}
 </Button>
 </CardHeader>
 <CardContent className="p-0">
 <Table>
 <TableHeader className="bg-muted/5">
 <TableRow>
 <TableHead className="pl-8 font-black uppercase text-[10px] tracking-widest">{t('admin.forms.username')}</TableHead>
 <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('admin.forms.role')}</TableHead>
 <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('admin.forms.status')}</TableHead>
 <TableHead className="pr-8 font-black uppercase text-[10px] tracking-widest">{t('common.actions')}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {(usersQuery.data ?? []).map((user) => (
 <TableRow key={user.id} className="group hover:bg-muted/20 transition-colors">
 <TableCell className="pl-8 py-5">
 <div className="flex flex-col">
 <span className="font-bold text-sm tracking-tight">{user.username}</span>
 <span className="text-[11px] text-muted-foreground italic font-medium">{user.email}</span>
 </div>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 {user.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5 text-amber-500"/> :
 user.role === 'judge' ? <Shield className="w-3.5 h-3.5 text-primary"/> :
 <ShieldAlert className="w-3.5 h-3.5 text-emerald-500"/>}
 <span className="text-[11px] font-black uppercase tracking-widest opacity-80">{t(`roles.${user.role}`)}</span>
 </div>
 </TableCell>
 <TableCell>
 <Badge 
 variant="outline"
 className={cn(
"text-[9px] font-black uppercase tracking-tighter py-0 h-5",
 String(user.is_active).toLowerCase() === 'true' ?"border-[var(--primary)]/20 text-[var(--primary)] bg-emerald-500/5":"border-destructive/20 text-destructive bg-destructive/5"
 )}
 >
 {String(user.is_active).toLowerCase() === 'true' ? t('admin.forms.active') : t('admin.forms.inactive')}
 </Badge>
 </TableCell>
 <TableCell className="pr-8">
 <Button 
 variant="ghost"
 size="sm"
 className="text-destructive hover:text-destructive hover:bg-destructive/10 font-bold gap-2 h-8"
 disabled={deactivateMutation.isPending}
 onClick={() => {
 if (!window.confirm(t('admin.messages.confirmDeactivate'))) return
 deactivateMutation.mutate(user.id)
 }}
 >
 <Power className="w-3.5 h-3.5"/>
 {t('admin.forms.deactivate')}
 </Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 </div>

 {/* Create User Form - Sidebar Style */}
 <div className="lg:col-span-4">
 <Card className={cn(
"shadow-2xl border-primary/20 overflow-hidden transition-all duration-500",
 isCreateOpen ?"opacity-100 translate-y-0":"opacity-50 pointer-events-none translate-y-4 blur-sm grayscale"
 )}>
 <CardHeader className="bg-primary/5 border-b py-5">
 <div className="flex items-center gap-2">
 <UserPlus className="w-5 h-5 text-primary"/>
 <CardTitle className="text-lg">Institutional Onboarding</CardTitle>
 </div>
 </CardHeader>
 <CardContent className="p-8 space-y-6">
 <div className="space-y-4">
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
 <Mail className="w-3 h-3"/>
 {t('admin.forms.email')}
 </label>
 <input 
 placeholder="legal@difc.gov.ae"
 className="w-full bg-muted/20 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold placeholder:font-normal"
 value={form.email} 
 onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} 
 />
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
 <User className="w-3 h-3"/>
 {t('admin.forms.username')}
 </label>
 <input 
 placeholder="e.g. j.doe"
 className="w-full bg-muted/20 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold placeholder:font-normal"
 value={form.username} 
 onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))} 
 />
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
 <Search className="w-3 h-3"/>
 {t('admin.forms.fullName')}
 </label>
 <input 
 placeholder="Hon. Justice John Doe"
 className="w-full bg-muted/20 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold placeholder:font-normal"
 value={form.full_name} 
 onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))} 
 />
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
 <Shield className="w-3 h-3"/>
 {t('admin.forms.role')}
 </label>
 <select 
 className="w-full bg-muted/20 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer font-bold"
 value={form.role} 
 onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value as AdminCreateUserRequest['role'] }))}
 >
 <option value="admin">{t('roles.admin')}</option>
 <option value="judge">{t('roles.judge')}</option>
 <option value="clerk">{t('roles.clerk')}</option>
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
 <Key className="w-3 h-3"/>
 {t('admin.forms.password')}
 </label>
 <input 
 type="password"
 placeholder="••••••••"
 className="w-full bg-muted/20 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold"
 value={form.password} 
 onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))} 
 />
 </div>
 </div>

 <div className="flex gap-4 pt-4 border-t">
 <Button 
 variant="outline"
 className="flex-1 rounded-xl h-11"
 onClick={() => setIsCreateOpen(false)}
 >
 {t('common.cancel')}
 </Button>
 <Button
 className="flex-1 rounded-xl h-11 font-bold shadow-lg shadow-primary/20"
 disabled={createMutation.isPending}
 onClick={() => {
 if (!form.email || !form.username || !form.password) {
 setMessageType('error')
 setMessage(t('admin.messages.requiredFields'))
 return
 }
 createMutation.mutate(form)
 }}
 >
 {createMutation.isPending ?"Onboarding...": t('common.submit')}
 </Button>
 </div>
 </CardContent>
 </Card>

 <div className="mt-8 p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
 <div className="flex items-center gap-3 text-amber-600 mb-2">
 <ShieldAlert className="w-5 h-5"/>
 <h5 className="text-[11px] font-black uppercase tracking-widest">IAM Security Policy</h5>
 </div>
 <p className="text-[10px] text-muted-foreground font-medium italic leading-relaxed">
 All new accounts require mandatory 2FA activation upon first login. Judicial roles gain immediate access to the Reasoning Engine cluster.
 </p>
 </div>
 </div>
 </div>
 </div>
 </PortalLayout>
 )
}

export default UserManagement
