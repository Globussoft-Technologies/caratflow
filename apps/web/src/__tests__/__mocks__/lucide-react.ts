// Mock for lucide-react - auto-generates stub components for any icon import
import { createElement, type FC } from 'react';

function createIcon(name: string): FC<Record<string, unknown>> {
  const Icon: FC<Record<string, unknown>> = (props) =>
    createElement('svg', { 'data-testid': `icon-${name}`, ...props });
  Icon.displayName = name;
  return Icon;
}

// Cache created icons
const iconCache: Record<string, FC<Record<string, unknown>>> = {};

function getIcon(name: string): FC<Record<string, unknown>> {
  if (!iconCache[name]) {
    iconCache[name] = createIcon(name);
  }
  return iconCache[name]!;
}

// Use a Proxy as the module default to handle any named export
const handler: ProxyHandler<Record<string, unknown>> = {
  get(_target, prop: string) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return undefined;
    return getIcon(prop);
  },
  has() {
    return true;
  },
};

const mod: Record<string, unknown> = new Proxy({}, handler);

// Pre-export all known icons so ESM named imports resolve correctly
// This list covers all icons used across the CaratFlow codebase
const iconNames = [
  'Activity', 'AlertCircle', 'AlertTriangle', 'ArrowDown', 'ArrowDownLeft',
  'ArrowDownRight', 'ArrowLeft', 'ArrowLeftRight', 'ArrowRight', 'ArrowRightLeft',
  'ArrowUp', 'ArrowUpRight', 'Award', 'Ban', 'Banknote', 'BarChart', 'BarChart3', 'Barcode',
  'Bell', 'Book', 'BookOpen', 'Briefcase', 'Building2', 'Calculator', 'Calendar',
  'CalendarDays', 'Camera', 'Check', 'CheckCircle', 'CheckCircle2', 'ChevronDown',
  'ChevronRight', 'Circle', 'ClipboardCheck', 'ClipboardList', 'Clock', 'Coins',
  'Copy', 'CreditCard', 'Crosshair', 'Diamond', 'Download', 'Edit', 'Edit2',
  'ExternalLink', 'Eye', 'EyeOff', 'Factory', 'FileSpreadsheet', 'FileText',
  'Filter', 'Gavel', 'Gem', 'Gift', 'Glasses', 'Globe', 'GripVertical', 'Hammer', 'Hash',
  'Grid3x3', 'Heart', 'HelpCircle', 'Home', 'Image', 'IndianRupee', 'Info', 'Key', 'Landmark',
  'Languages', 'Layers', 'LayoutGrid', 'LayoutList', 'Lightbulb', 'Link', 'List',
  'Loader2', 'Lock', 'Mail', 'MapPin', 'Megaphone', 'Menu', 'MessageCircle',
  'MessageSquare', 'Minus', 'Monitor', 'MoreVertical', 'Package', 'PanelLeft',
  'PanelRight', 'Pause', 'Pencil', 'Percent', 'Phone', 'PieChart', 'PiggyBank', 'Play', 'Plus', 'Printer',
  'QrCode', 'Receipt', 'RefreshCw', 'Repeat', 'RotateCcw', 'Save', 'Scale', 'Scan',
  'ScanLine', 'Search', 'Send', 'Server', 'Settings', 'Settings2', 'Share2',
  'Shield', 'ShieldCheck', 'ShieldX', 'Ship', 'ShoppingBag', 'ShoppingCart',
  'Smartphone', 'Sparkles', 'Star', 'Store', 'Table', 'Tag', 'Target', 'Terminal', 'ToggleLeft',
  'ToggleRight', 'Trash2', 'TrendingDown', 'TrendingUp', 'Trophy', 'Truck', 'Type',
  'Umbrella', 'Undo', 'Upload', 'User', 'UserPlus', 'Users', 'Wallet', 'Wand2',
  'Wifi', 'Wrench', 'X', 'XCircle', 'Zap', 'ZoomIn', 'ZoomOut',
] as const;

// Generate named exports for each icon
const exports: Record<string, FC<Record<string, unknown>>> = {};
for (const name of iconNames) {
  exports[name] = getIcon(name);
}

// Re-export everything
export const {
  Activity, AlertCircle, AlertTriangle, ArrowDown, ArrowDownLeft,
  ArrowDownRight, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowRightLeft,
  ArrowUp, ArrowUpRight, Award, Ban, Banknote, BarChart, BarChart3, Barcode,
  Bell, Book, BookOpen, Briefcase, Building2, Calculator, Calendar,
  CalendarDays, Camera, Check, CheckCircle, CheckCircle2, ChevronDown,
  ChevronRight, Circle, ClipboardCheck, ClipboardList, Clock, Coins,
  Copy, CreditCard, Crosshair, Diamond, Download, Edit, Edit2,
  ExternalLink, Eye, EyeOff, Factory, FileSpreadsheet, FileText,
  Filter, Gavel, Gem, Gift, Glasses, Globe, GripVertical, Hammer, Hash,
  Grid3x3, Heart, HelpCircle, Home, Image, IndianRupee, Info, Key, Landmark,
  Languages, Layers, LayoutGrid, LayoutList, Lightbulb, Link, List,
  Loader2, Lock, Mail, MapPin, Megaphone, Menu, MessageCircle,
  MessageSquare, Minus, Monitor, MoreVertical, Package, PanelLeft,
  PanelRight, Pause, Pencil, Percent, Phone, PieChart, PiggyBank, Play, Plus, Printer,
  QrCode, Receipt, RefreshCw, Repeat, RotateCcw, Save, Scale, Scan,
  ScanLine, Search, Send, Server, Settings, Settings2, Share2,
  Shield, ShieldCheck, ShieldX, Ship, ShoppingBag, ShoppingCart,
  Smartphone, Sparkles, Star, Store, Table, Tag, Target, Terminal, ToggleLeft,
  ToggleRight, Trash2, TrendingDown, TrendingUp, Trophy, Truck, Type,
  Umbrella, Undo, Upload, User, UserPlus, Users, Wallet, Wand2,
  Wifi, Wrench, X, XCircle, Zap, ZoomIn, ZoomOut,
} = exports;

export default mod;
