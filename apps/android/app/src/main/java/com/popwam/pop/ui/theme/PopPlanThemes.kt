package com.popwam.pop.ui.theme
import androidx.compose.ui.graphics.Color
data class PopPlanTheme(val cardBackground:Color,val primary:Color,val secondary:Color,val textPrimary:Color,val textSecondary:Color,val border:Color,val iconPrimary:Color,val iconSecondary:Color,val accent:Color)
private fun c(value:Long)=Color(value)
val PopPlanThemes=mapOf(
 "default" to PopPlanTheme(c(0xFF050505),c(0xFFD4AF37),c(0xFFFFFFFF),c(0xFFFFFFFF),c(0xFFB8B8B8),c(0xFF6E5420),c(0xFFD4AF37),c(0xFFFFFFFF),c(0xFFF5D76E)),
 "personal" to PopPlanTheme(c(0xFFFFFFFF),c(0xFF2563EB),c(0xFF111111),c(0xFF111111),c(0xFF6B7280),c(0xFFD1D5DB),c(0xFF2563EB),c(0xFF111111),c(0xFF38BDF8)),
 "plus" to PopPlanTheme(c(0xFF071A2C),c(0xFF22D3EE),c(0xFFFFFFFF),c(0xFFFFFFFF),c(0xFFB8D9E8),c(0xFF1E3A5F),c(0xFF22D3EE),c(0xFFFFFFFF),c(0xFF38BDF8)),
 "pro" to PopPlanTheme(c(0xFF050505),c(0xFFD4AF37),c(0xFFFFFFFF),c(0xFFFFFFFF),c(0xFFC9C9C9),c(0xFF6E5420),c(0xFFD4AF37),c(0xFFFFFFFF),c(0xFFF5D76E)),
 "business" to PopPlanTheme(c(0xFF0F172A),c(0xFFC0C0C0),c(0xFFFFFFFF),c(0xFFFFFFFF),c(0xFFB8C1CC),c(0xFF50637A),c(0xFFC0C0C0),c(0xFFFFFFFF),c(0xFF9CA3AF)),
 "proBusiness" to PopPlanTheme(c(0xFF050505),c(0xFFF2C94C),c(0xFFFFF6D5),c(0xFFFFFFFF),c(0xFFD8D0B7),c(0xFFD4AF37),c(0xFFF2C94C),c(0xFFFFF6D5),c(0xFFFFD86B)),
)
fun popPlanTheme(plan:String?)=PopPlanThemes[plan]?:PopPlanThemes.getValue("default")
