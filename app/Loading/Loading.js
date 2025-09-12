"use client";

import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingScreen({ show = false, text = "Đang tải..." }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="loading-screen"
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl shadow-lg"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="text-gray-700 font-medium text-lg">{text}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
